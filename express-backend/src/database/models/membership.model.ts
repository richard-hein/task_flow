import mongoose, { Schema, type InferSchemaType } from "mongoose";

const membershipSchema = new Schema(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Org",
      require: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      require: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["admin", "member"],
      default: "member",
      require: true,
    },
  },
  { timestamps: true },
);

membershipSchema.index({ orgId: 1, userId: 1 }, { unique: true });

export type Membership = InferSchemaType<typeof membershipSchema>;

const MembershipModel = mongoose.model("Membership", membershipSchema);
export default MembershipModel;
