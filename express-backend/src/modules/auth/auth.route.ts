import { Router } from "express";
import { authController } from "./auth.module.js";
import { authenticateJWT } from "../../common/strategies/jwt.strategy.js";

const authRoutes = Router();

authRoutes.post("/register", authController.register);
authRoutes.post("/login", authController.login);
authRoutes.post("/verify/email", authController.verifyEmail);
authRoutes.post("/password/forgot", authController.forgotPassword);
authRoutes.post("/logout", authenticateJWT, authController.logout);

authRoutes.get("/refresh", authController.refreshToken);

export default authRoutes;
