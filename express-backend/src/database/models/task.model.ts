import mongoose, { Schema, type InferSchemaType } from "mongoose";

const taskSchema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Org",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    desc: {
      type: String,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["todo", "doing", "done"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "med", "high"],
      default: "med",
    },
    assigneeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    dueAt: {
      type: Date,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

export type Task = InferSchemaType<typeof taskSchema>;

const TaskModel = mongoose.model("Task", taskSchema);
export default TaskModel;
