import { Request, Response, NextFunction } from "express";
import { container } from "../../container";
import { RegisterUseCase, LoginUseCase } from "../../../application/use-cases/auth/AuthUseCases";

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const useCase = container.resolve(RegisterUseCase);
      const result = await useCase.execute(req.body);
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const useCase = container.resolve(LoginUseCase);
      const result = await useCase.execute(req.body);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }

  static async me(req: Request, res: Response): Promise<void> {
    res.json({ data: req.user });
  }
}
