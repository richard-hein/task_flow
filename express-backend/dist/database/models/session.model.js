import mongoose, { Document, Schema } from "mongoose";
import { thirtyDaysFromNow } from "../../common/utils/date-time.js";
const sessionSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true,
        required: true,
    },
    userAgent: {
        type: String,
        required: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    expiredAt: {
        type: Date,
        required: true,
        default: thirtyDaysFromNow,
    },
});
const SessionModel = mongoose.model("Session", sessionSchema);
export default SessionModel;
