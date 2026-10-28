import mongoose, { Schema, type InferSchemaType } from "mongoose";

const commentSchema = new Schema(
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
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
  },
  { timestamps: true },
);

// The feed read pattern: one task, oldest first.
commentSchema.index({ taskId: 1, createdAt: 1 });

export type Comment = InferSchemaType<typeof commentSchema>;

const CommentModel = mongoose.model("Comment", commentSchema);
export default CommentModel;
