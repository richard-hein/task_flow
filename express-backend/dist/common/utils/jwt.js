import jwt from "jsonwebtoken";
import { config } from "../../config/app.config.js";
const signDefaults = {
    audience: ["user"],
};
const verifyDefaults = {
    audience: ["user"],
};
export const accessTokenSignOptions = {
    expiresIn: config.JWT.EXPIRES_IN,
    secret: config.JWT.SECRET,
};
export const refreshTokenSignOptions = {
    expiresIn: config.JWT.REFRESH_EXPIRES_IN,
    secret: config.JWT.REFRESH_SECRET,
};
export const signJwtToken = (payload, options) => {
    const { secret, ...signOptions } = options || accessTokenSignOptions;
    return jwt.sign(payload, secret || config.JWT.SECRET, {
        ...signDefaults,
        ...signOptions,
    });
};
export const verifyJwtToken = (token, options) => {
    try {
        const { secret = config.JWT.SECRET, ...opts } = options || {};
        const payload = jwt.verify(token, secret, {
            ...verifyDefaults,
            ...opts,
        });
        return { payload };
    }
    catch (error) {
        return {
            error: error.message,
        };
    }
};
