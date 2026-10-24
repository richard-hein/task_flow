import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { HTTPSTATUS } from "../../config/http.config.js";
import { emailSchema, loginSchema, registerSchema, resetPasswordSchema, verificationSchema, } from "../../common/validators/auth.validators.js";
import { clearAuthenticationCookies, getAccessTokenCookieOptions, getRefreshTokenCookieOptions, setAuthenticationCookies, } from "../../common/utils/cookie.js";
import { NotFoundException, UnauthorizedException, } from "../../common/utils/catch-error.js";
export class AuthController {
    constructor(authService) {
        this.register = asyncHandler(async (req, res) => {
            const body = registerSchema.parse({ ...req.body });
            const { user } = await this.authService.register(body);
            return res.status(HTTPSTATUS.CREATED).json({
                message: "User registered successfully.",
                data: user,
            });
        });
        this.login = asyncHandler(async (req, res) => {
            const userAgent = req.headers["user-agent"];
            const body = loginSchema.parse({
                ...req.body,
                userAgent,
            });
            const { user, accessToken, refreshToken, mfaRequired } = await this.authService.login(body);
            if (mfaRequired) {
                return res.status(HTTPSTATUS.OK).json({
                    message: "Verify MFA authentications",
                    mfaRequired: true,
                    user,
                });
            }
            return setAuthenticationCookies({
                res,
                accessToken,
                refreshToken,
            })
                .status(HTTPSTATUS.OK)
                .json({
                message: "User logged in successfully",
                user,
            });
        });
        this.refreshToken = asyncHandler(async (req, res) => {
            const refreshToken = req.cookies.refreshToken;
            if (!refreshToken) {
                throw new UnauthorizedException("User not authorized");
            }
            const { accessToken, newRefreshToken } = await this.authService.refreshToken(refreshToken);
            if (newRefreshToken) {
                res.cookie("refreshToken", newRefreshToken, getRefreshTokenCookieOptions());
            }
            return res
                .status(HTTPSTATUS.OK)
                .cookie("accessToken", accessToken, getAccessTokenCookieOptions())
                .json({
                message: "Refresh access token successfully",
            });
        });
        this.verifyEmail = asyncHandler(async (req, res) => {
            const { code } = verificationSchema.parse(req.body);
            await this.authService.verifyEmail(code);
            return res.status(HTTPSTATUS.OK).json({
                message: "Email verified successfully",
            });
        });
        this.forgotPassword = asyncHandler(async (req, res) => {
            const email = emailSchema.parse(req.body.email);
            await this.authService.forgotPassword(email);
            return res.status(HTTPSTATUS.OK).json({
                message: "Password reset email has been send",
            });
        });
        this.resetPassword = asyncHandler(async (req, res) => {
            const body = resetPasswordSchema.parse(req.body);
            await this.authService.resetPassword(body);
            return clearAuthenticationCookies(res).status(HTTPSTATUS.OK).json({
                message: "Reset password successfully",
            });
        });
        this.logout = asyncHandler(async (req, res) => {
            const sessionId = req.sessionId;
            if (!sessionId) {
                throw new NotFoundException("Session is invalid.");
            }
            await this.authService.logout(sessionId);
            return clearAuthenticationCookies(res).status(HTTPSTATUS.OK).json({
                message: "User logout successfully.",
            });
        });
        this.authService = authService;
    }
}
