import { Router } from "express";
import { commentController } from "./comment.module.js";

const commentRoutes = Router();

commentRoutes.post("/tasks/:tid/comments", commentController.createComment);
commentRoutes.get("/tasks/:tid/comments", commentController.listComments);
commentRoutes.delete("/comments/:cid", commentController.deleteComment);

export default commentRoutes;
