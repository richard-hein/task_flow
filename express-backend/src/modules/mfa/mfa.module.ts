import { MfaController } from "./mfa.controller.js";
import { MfaService } from "./mfa.service.js";

const mfaService = new MfaService();
const mfaController = new MfaController(mfaService);

export { mfaService, mfaController };
