import { CommentController } from "./comment.controller.js";
import { CommentService } from "./comment.service.js";

const commentService = new CommentService();
export const commentController = new CommentController(commentService);
