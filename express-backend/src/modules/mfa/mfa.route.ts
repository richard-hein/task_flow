import { Router } from "express";
import { authenticateJWT } from "../../common/strategies/jwt.strategy.js";
import { mfaController } from "./mfa.module.js";

const mfaRoutes = Router();

mfaRoutes.get("/setup", authenticateJWT, mfaController.generateMFASetup);
mfaRoutes.post("/verify", authenticateJWT, mfaController.verifyMFASetup);
mfaRoutes.put("/revoke", authenticateJWT, mfaController.revokeMFA);

mfaRoutes.post("/verify-login", mfaController.verifyMFAForLogin);
export default mfaRoutes;
