import mongoose, {} from "mongoose";
import { Schema } from "mongoose";
const orgSchema = new Schema({
    name: {
        type: String,
        required: true,
        index: true,
        trim: true,
    },
    ownerId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
}, { timestamps: true });
const OrgModel = mongoose.model("Org", orgSchema);
export default OrgModel;
