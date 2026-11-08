import { Router } from "express";
import packageController from "./package.controller";
import {
  createPackageCatalogSchema,
  updatePackageCatalogSchema,
  packageIdParamSchema,
} from "./package.validator";
import { validateBody, validateParams } from "../../middlewares/validation.middleware";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.post("/", validateBody(createPackageCatalogSchema), packageController.create);
router.get("/", packageController.getAll);
router.get("/:id", validateParams(packageIdParamSchema), packageController.getById);
router.put("/:id", validateParams(packageIdParamSchema), validateBody(updatePackageCatalogSchema), packageController.update);
router.delete("/:id", validateParams(packageIdParamSchema), packageController.delete);

export default router;
