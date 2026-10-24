import { HTTPSTATUS } from "../../config/http.config.js";
export class AppError extends Error {
    constructor(message, statusCode = HTTPSTATUS.INTERNAL_SERVER_ERROR, errorCode) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        Error.captureStackTrace(this, this.constructor);
    }
}
