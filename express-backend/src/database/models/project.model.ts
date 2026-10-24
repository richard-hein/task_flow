import mongoose, { Schema, type InferSchemaType } from "mongoose";

const projectSchema = new Schema(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Org",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    archived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export type Project = InferSchemaType<typeof projectSchema>;

const ProjectModel = mongoose.model("Project", projectSchema);
export default ProjectModel;
