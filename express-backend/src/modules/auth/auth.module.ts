import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";

const authService = new AuthService();

const authController = new AuthController(authService);

export { authService, authController };
