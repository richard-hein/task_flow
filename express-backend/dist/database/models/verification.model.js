import mongoose from "mongoose";
import { VerificationEnum } from "../../common/enums/verification-code.enum.js";
import { Schema } from "mongoose";
import { generateUniqueCode } from "../../common/utils/uuid.js";
const verificationCodeSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true,
        required: true,
    },
    orgId: {
        type: Schema.Types.ObjectId,
        ref: "Org",
    },
    code: {
        type: String,
        unique: true,
        required: true,
        default: generateUniqueCode,
    },
    type: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
});
const VerificationCodeModel = mongoose.model("VerificationCode", verificationCodeSchema, "verification_codes");
export default VerificationCodeModel;
