import mongoose, { Document, Schema } from "mongoose";
import { compareValue, hashValue } from "../../common/utils/bcrypt.js";
const userPreferencesSchema = new Schema({
    enable2FA: { type: Boolean, default: false },
    emailNotification: { type: Boolean, default: true },
    twoFactorSecret: { type: String, required: false },
});
const userSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        unique: true,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    userPreferences: {
        type: userPreferencesSchema,
        default: {},
    },
}, {
    timestamps: true,
    toJSON: {},
});
userSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await hashValue(this.password);
    }
    next();
});
userSchema.methods.comparePassword = async function (value) {
    return compareValue(value, this.password);
};
userSchema.set("toJSON", {
    transform: function (doc, ret) {
        delete ret.password;
        delete ret.userPreferences.twoFactorSecret;
        return ret;
    },
});
const UserModel = mongoose.model("User", userSchema);
export default UserModel;
