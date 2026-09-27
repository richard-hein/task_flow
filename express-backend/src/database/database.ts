import mongoose from "mongoose";
import { config } from "../config/app.config.js";

const connectDb = async () => {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log("Connected to Mongo database.");
  } catch (error) {
    console.log(
      "Error connecting to Mongo database.",
      (error as Error).message,
    );
    process.exit(1);
  }
};

export default connectDb;
