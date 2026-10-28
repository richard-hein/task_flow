import type { Request, Response } from "express";
import z from "zod";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type { CommentService } from "./comment.service.js";
import {
  createCommentSchema,
  listCommentsQuerySchema,
} from "../../common/validators/comment.validators.js";
import { HTTPSTATUS } from "../../config/http.config.js";

export class CommentController {
  private commentService: CommentService;

  constructor(commentService: CommentService) {
    this.commentService = commentService;
  }

  public createComment = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const tid = z.string().parse(req.params.tid);
      const { body } = createCommentSchema.parse(req.body);
      const result = await this.commentService.createComment(
        tid,
        req.user!._id.toString(),
        body,
      );
      return res.status(HTTPSTATUS.CREATED).json({
        message: "Comment created successfully.",
        ...result,
      });
    },
  );

  public listComments = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const tid = z.string().parse(req.params.tid);
      const query = listCommentsQuerySchema.parse(req.query);
      const result = await this.commentService.listComments(
        tid,
        req.user!._id.toString(),
        query,
      );
      return res.status(HTTPSTATUS.OK).json({
        message: "Comments retrieved successfully.",
        ...result,
      });
    },
  );

  public deleteComment = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const cid = z.string().parse(req.params.cid);
      await this.commentService.deleteComment(
        cid,
        req.user!._id.toString(),
      );
      return res.status(HTTPSTATUS.OK).json({
        message: "Comment deleted successfully.",
      });
    },
  );
}
