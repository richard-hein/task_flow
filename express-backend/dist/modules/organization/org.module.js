import { OrganizationController } from "./org.controller.js";
import { OrganizationService } from "./org.service.js";
const organizationService = new OrganizationService();
export const organizationController = new OrganizationController(organizationService);
