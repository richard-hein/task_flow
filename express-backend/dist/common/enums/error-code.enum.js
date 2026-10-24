var ErrorCode;
(function (ErrorCode) {
    ErrorCode["AUTH_EMAIL_ALREADY_EXISTS"] = "AUTH_EMAIL_ALREADY_EXISTS";
    ErrorCode["AUTH_INVALID_TOKEN"] = "AUTH_INVALID_TOKEN";
    ErrorCode["AUTH_USER_NOT_FOUND"] = "AUTH_USER_NOT_FOUND";
    ErrorCode["AUTH_NOT_FOUND"] = "AUTH_NOT_FOUND";
    ErrorCode["AUTH_TOO_MANY_ATTEMPTS"] = "AUTH_TOO_MANY_ATTEMPTS";
    ErrorCode["AUTH_UNAUTHORIZED_ACCESS"] = "AUTH_UNAUTHORIZED_ACCESS";
    ErrorCode["AUTH_TOKEN_NOT_FOUND"] = "AUTH_TOKEN_NOT_FOUND";
    // Access Control Errors
    ErrorCode["ACCESS_FORBIDDEN"] = "ACCESS_FORBIDDEN";
    ErrorCode["ACCESS_UNAUTHORIZED"] = "ACCESS_UNAUTHORIZED";
    // Validation and Resource Errors
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCode["RESOURCE_NOT_FOUND"] = "RESOURCE_NOT_FOUND";
    // System Errors
    ErrorCode["INTERNAL_SERVER_ERROR"] = "INTERNAL_SERVER_ERROR";
    ErrorCode["VERIFICATION_ERROR"] = "VERIFICATION_ERROR";
})(ErrorCode || (ErrorCode = {}));
export { ErrorCode };
