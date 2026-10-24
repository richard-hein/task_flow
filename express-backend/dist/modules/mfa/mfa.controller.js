import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { HTTPSTATUS } from "../../config/http.config.js";
import { verifyMfaForLoginSchema, verifyMfaSchema, } from "../../common/validators/mfa.validator.js";
import { setAuthenticationCookies } from "../../common/utils/cookie.js";
export class MfaController {
    constructor(mfaService) {
        this.generateMFASetup = asyncHandler(async (req, res) => {
            const { secret, qrImageUrl, message } = await this.mfaService.generateMFASetup(req);
            return res.status(HTTPSTATUS.OK).json({
                message,
                secret,
                qrImageUrl,
            });
        });
        this.verifyMFASetup = asyncHandler(async (req, res) => {
            const { code, secretKey } = verifyMfaSchema.parse({
                ...req.body,
            });
            const { userPreferences, message } = await this.mfaService.verifyMFASetup(req, code, secretKey);
            return res.status(HTTPSTATUS.OK).json({
                message: message,
                userPreferences: userPreferences,
            });
        });
        this.revokeMFA = asyncHandler(async (req, res) => {
            const { message, userPreferences } = await this.mfaService.revokeMFA(req);
            return res.status(HTTPSTATUS.OK).json({
                message,
                userPreferences,
            });
        });
        this.verifyMFAForLogin = asyncHandler(async (req, res) => {
            const { code, email, userAgent } = verifyMfaForLoginSchema.parse({
                ...req.body,
                userAgent: req.headers["user-agent"],
            });
            const { accessToken, refreshToken, user } = await this.mfaService.verifyMFAForLogin(code, email, userAgent);
            return setAuthenticationCookies({
                res,
                accessToken,
                refreshToken,
            })
                .status(HTTPSTATUS.OK)
                .json({
                message: "Verified & login successfully",
                user,
            });
        });
        this.mfaService = mfaService;
    }
}
