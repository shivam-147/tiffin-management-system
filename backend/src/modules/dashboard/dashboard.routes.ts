import { Router } from "express";
import dashboardController from "./dashboard.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

// Protect dashboard route with admin authentication
router.use(authenticate);

router.get("/summary", dashboardController.getSummary);

export default router;
