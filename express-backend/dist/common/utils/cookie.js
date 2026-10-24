import {} from "express";
import { config } from "../../config/app.config.js";
import { calculateExpirationDate } from "./date-time.js";
export const REFRESH_PATH = `${config.BASE_PATH}/auth/refresh`;
const defaults = {
    httpOnly: true,
    secure: config.NODE_ENV === "production" ? true : false,
    sameSite: config.NODE_ENV === "production" ? "strict" : "lax",
};
export const getRefreshTokenCookieOptions = () => {
    const expiresIn = config.JWT.REFRESH_EXPIRES_IN;
    const expires = calculateExpirationDate(expiresIn);
    return {
        ...defaults,
        expires,
        path: REFRESH_PATH,
    };
};
export const getAccessTokenCookieOptions = () => {
    const expiresIn = config.JWT.EXPIRES_IN;
    const expires = calculateExpirationDate(expiresIn);
    return {
        ...defaults,
        expires,
        path: "/",
    };
};
export const setAuthenticationCookies = ({ res, accessToken, refreshToken, }) => res
    .cookie("accessToken", accessToken, getAccessTokenCookieOptions())
    .cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());
export const clearAuthenticationCookies = (res) => res.clearCookie("accessToken").clearCookie("refreshToken", {
    path: REFRESH_PATH,
});
