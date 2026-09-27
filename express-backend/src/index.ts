import "dotenv/config";
import cors from "cors";
import express, { type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import { config } from "./config/app.config.js";
import connectDb from "./database/database.js";
import { errorHandler } from "./middlewares/errorHandler.js";
// import { HTTPSTATUS } from "./config/http.config.js";
import { asyncHandler } from "./middlewares/asyncHandler.js";
import authRoutes from "./modules/auth/auth.route.js";
import passport from "./middlewares/passport.js";
import { authenticateJWT } from "./common/strategies/jwt.strategy.js";
import sessionRoutes from "./modules/session/session.route.js";
import mfaRoutes from "./modules/mfa/mfa.route.js";

const app = express();
const BASE_PATH = config.BASE_PATH;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({ origin: config.APP_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(passport.initialize());

app.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {}),
);

app.use(`${BASE_PATH}/auth`, authRoutes);
app.use(`${BASE_PATH}/session`, authenticateJWT, sessionRoutes);
app.use(`${BASE_PATH}/mfa`, mfaRoutes);

app.use(errorHandler);
app.listen(config.PORT, async () => {
  console.log(`Server listening on port ${config.PORT} in ${config.NODE_ENV}`);
  await connectDb();
});
