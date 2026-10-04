import mongoose, { type InferSchemaType } from "mongoose";
import { Schema } from "mongoose";

const orgSchema = new Schema(
  {
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
  },
  { timestamps: true },
);
//Infer the TypeScript type directly from the Schema!
export type Org = InferSchemaType<typeof orgSchema>;

const OrgModel = mongoose.model("Org", orgSchema);

export default OrgModel;
