import { Router } from "express";
import { ContentController } from "../controllers/ContentController";
import { AuthController } from "../controllers/AuthController";
import {
  authMiddleware,
  validate,
  requireRole,
} from "../middlewares";
import {
  CreateContentSchema,
  UpdateContentSchema,
  ListContentSchema,
} from "../../../application/dtos/ContentDTO";
import {
  RegisterSchema,
  LoginSchema,
} from "../../../application/use-cases/auth/AuthUseCases";

const router = Router();

router.get("/health", (_, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env["npm_package_version"] ?? "1.0.0",
  });
});


router.post("/auth/register", validate(RegisterSchema), AuthController.register);
router.post("/auth/login", validate(LoginSchema), AuthController.login);
router.get("/auth/me", authMiddleware, AuthController.me);

router.get("/contents", validate(ListContentSchema, "query"), ContentController.list);
router.get("/contents/slug/:slug", ContentController.getBySlug);
router.get("/contents/:id", ContentController.getById);

router.post(
  "/contents",
  authMiddleware,
  validate(CreateContentSchema),
  ContentController.create
);

router.patch(
  "/contents/:id",
  authMiddleware,
  validate(UpdateContentSchema),
  ContentController.update
);

router.post(
  "/contents/:id/publish",
  authMiddleware,
  ContentController.publish
);

router.post(
  "/contents/:id/unpublish",
  authMiddleware,
  requireRole("ADMIN", "EDITOR"),
  ContentController.publish
);

router.delete(
  "/contents/:id",
  authMiddleware,
  ContentController.delete
);

export { router };
