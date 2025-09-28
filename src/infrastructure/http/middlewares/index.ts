import { Request, Response, NextFunction } from "express";
import { container } from "../../container";
import { ITokenService } from "../../../application/ports/services";
import { TOKENS } from "../../tokens";
import {
  DomainError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from "../../../domain/errors/DomainError";
import { ZodSchema, ZodError } from "zod";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing or invalid Authorization header" });
      return;
    }

    const token = authHeader.slice(7);
    const tokenService = container.resolve<ITokenService>(TOKENS.TokenService);
    const payload = tokenService.verify(token);

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: `Requires role: ${roles.join(" or ")}` });
      return;
    }

    next();
  };
}

export function validate(schema: ZodSchema, source: "body" | "query" | "params" = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const fields: Record<string, string[]> = {};
      result.error.issues.forEach(issue => {
        const key = issue.path.join(".");
        if (!fields[key]) fields[key] = [];
        fields[key].push(issue.message);
      });

      res.status(422).json({
        error: "Validation failed",
        fields,
      });
      return;
    }

    req[source] = result.data;
    next();
  };
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (err instanceof ValidationError) {
    res.status(422).json({ error: err.message, fields: err.fields });
    return;
  }
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message, code: err.code });
    return;
  }
  if (err instanceof UnauthorizedError) {
    res.status(401).json({ error: err.message, code: err.code });
    return;
  }
  if (err instanceof ForbiddenError) {
    res.status(403).json({ error: err.message, code: err.code });
    return;
  }
  if (err instanceof ConflictError) {
    res.status(409).json({ error: err.message, code: err.code });
    return;
  }
  if (err instanceof ZodError) {
    res.status(422).json({ error: "Validation failed", issues: err.issues });
    return;
  }
  if (err instanceof DomainError) {
    res.status(400).json({ error: err.message, code: err.code });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    ...(process.env["NODE_ENV"] !== "production" && { details: err.message }),
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: "Route not found",
  });
}
