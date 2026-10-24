import { HTTPSTATUS } from "../../config/http.config.js";
import { ErrorCode } from "../enums/error-code.enum.js";
import { AppError } from "./AppError.js";
export class NotFoundException extends AppError {
    constructor(message = "Resource not found", errorCode) {
        super(message, HTTPSTATUS.NOT_FOUND, errorCode || ErrorCode.RESOURCE_NOT_FOUND);
    }
}
export class BadRequestException extends AppError {
    constructor(message = "Bad Request", errorCode) {
        super(message, HTTPSTATUS.BAD_REQUEST, errorCode);
    }
}
export class UnauthorizedException extends AppError {
    constructor(message = "Unauthorized Access", errorCode) {
        super(message, HTTPSTATUS.UNAUTHORIZED, errorCode || ErrorCode.ACCESS_UNAUTHORIZED);
    }
}
export class InternalServerException extends AppError {
    constructor(message = "Internal Server Error", errorCode) {
        super(message, HTTPSTATUS.INTERNAL_SERVER_ERROR, errorCode || ErrorCode.INTERNAL_SERVER_ERROR);
    }
}
export class HttpException extends AppError {
    constructor(message = "Http Exception Error", statusCode, errorCode) {
        super(message, statusCode, errorCode);
    }
}
