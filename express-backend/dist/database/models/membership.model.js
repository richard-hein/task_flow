import mongoose, { Schema } from "mongoose";
const membershipSchema = new Schema({
    orgId: {
        type: Schema.Types.ObjectId,
        ref: "Org",
        required: true,
        index: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    role: {
        type: String,
        enum: ["admin", "member"],
        default: "member",
        required: true,
    },
}, { timestamps: true });
membershipSchema.index({ orgId: 1, userId: 1 }, { unique: true });
const MembershipModel = mongoose.model("Membership", membershipSchema);
export default MembershipModel;
