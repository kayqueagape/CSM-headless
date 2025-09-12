import { Request, Response, NextFunction } from "express";
import { container } from "../../container";
import { CreateContentUseCase } from "../../../application/use-cases/content/CreateContentUseCase";
import {
  GetContentByIdUseCase,
  GetContentBySlugUseCase,
  ListContentsUseCase,
  UpdateContentUseCase,
  PublishContentUseCase,
  DeleteContentUseCase,
} from "../../../application/use-cases/content/ContentUseCases";

export class ContentController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const useCase = container.resolve(CreateContentUseCase);
      const result = await useCase.execute({
        input: req.body,
        requesterId: req.user!.id,
      });
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const useCase = container.resolve(GetContentByIdUseCase);
      const result = await useCase.execute(req.params["id"]!);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }

  static async getBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const useCase = container.resolve(GetContentBySlugUseCase);
      const result = await useCase.execute(req.params["slug"]!);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const useCase = container.resolve(ListContentsUseCase);
      const result = await useCase.execute(req.query as never);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const useCase = container.resolve(UpdateContentUseCase);
      const result = await useCase.execute({
        contentId: req.params["id"]!,
        input: req.body,
        requesterId: req.user!.id,
      });
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }

  static async publish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const useCase = container.resolve(PublishContentUseCase);
      const result = await useCase.execute({
        contentId: req.params["id"]!,
        requesterId: req.user!.id,
      });
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const useCase = container.resolve(DeleteContentUseCase);
      await useCase.execute(req.params["id"]!, req.user!.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}
