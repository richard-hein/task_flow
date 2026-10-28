import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const ACTIVITY_ACTIONS = [
  "created",
  "moved",
  "assigned",
  "commented",
] as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

const activitySchema = new Schema(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Org",
      required: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      enum: ACTIVITY_ACTIONS,
      required: true,
    },
    detail: {
      type: String,
      maxlength: 200,
    },
    at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// The feed read pattern: one task, newest first.
activitySchema.index({ taskId: 1, at: -1 });

export type Activity = InferSchemaType<typeof activitySchema>;

const ActivityModel = mongoose.model("Activity", activitySchema);
export default ActivityModel;
