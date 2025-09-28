import "reflect-metadata";
import { container } from "tsyringe";
import { TOKENS } from "./tokens";
import { CreateContentUseCase } from "../application/use-cases/content/CreateContentUseCase";
import {
  GetContentByIdUseCase,
  GetContentBySlugUseCase,
  ListContentsUseCase,
  UpdateContentUseCase,
  PublishContentUseCase,
  DeleteContentUseCase,
} from "../application/use-cases/content/ContentUseCases";
import { RegisterUseCase, LoginUseCase } from "../application/use-cases/auth/AuthUseCases";
import { BcryptHashService } from "./services/BcryptHashService";
import { JwtTokenService } from "./services/JwtTokenService";
import { WinstonLogger } from "./services/WinstonLogger";
import { env } from "./config/env";

async function registerRepositories(): Promise<void> {
  if (env.DB_DRIVER === "mongodb") {
    const { MongoContentRepository } = await import("./database/mongodb/MongoContentRepository");
    const { MongoAuthorRepository } = await import("./database/mongodb/MongoAuthorRepository");
    const { MongoCategoryRepository } = await import("./database/mongodb/MongoCategoryRepository");

    container.registerSingleton(TOKENS.ContentRepository, MongoContentRepository);
    container.registerSingleton(TOKENS.AuthorRepository, MongoAuthorRepository);
    container.registerSingleton(TOKENS.CategoryRepository, MongoCategoryRepository);
  } else if (env.DB_DRIVER === "postgres") {
    const { PgContentRepository } = await import("./database/postgres/PgContentRepository");
    const { PgAuthorRepository } = await import("./database/postgres/PgAuthorRepository");
    const { PgCategoryRepository } = await import("./database/postgres/PgCategoryRepository");

    container.registerSingleton(TOKENS.ContentRepository, PgContentRepository);
    container.registerSingleton(TOKENS.AuthorRepository, PgAuthorRepository);
    container.registerSingleton(TOKENS.CategoryRepository, PgCategoryRepository);
  } else {
    // In-memory para testes / dev sem banco
    const { InMemoryContentRepository } = await import("./database/in-memory/InMemoryContentRepository");
    const { InMemoryAuthorRepository } = await import("./database/in-memory/InMemoryAuthorRepository");
    const { InMemoryCategoryRepository } = await import("./database/in-memory/InMemoryCategoryRepository");

    container.registerSingleton(TOKENS.ContentRepository, InMemoryContentRepository);
    container.registerSingleton(TOKENS.AuthorRepository, InMemoryAuthorRepository);
    container.registerSingleton(TOKENS.CategoryRepository, InMemoryCategoryRepository);
  }
}

export async function setupContainer(): Promise<void> {
  container.registerSingleton(TOKENS.HashService, BcryptHashService);
  container.registerSingleton(TOKENS.TokenService, JwtTokenService);
  container.registerSingleton(TOKENS.Logger, WinstonLogger);
  // Repositories (dinâmico baseado em DB_DRIVER)
  await registerRepositories();

  container.register(CreateContentUseCase, { useClass: CreateContentUseCase });
  container.register(GetContentByIdUseCase, { useClass: GetContentByIdUseCase });
  container.register(GetContentBySlugUseCase, { useClass: GetContentBySlugUseCase });
  container.register(ListContentsUseCase, { useClass: ListContentsUseCase });
  container.register(UpdateContentUseCase, { useClass: UpdateContentUseCase });
  container.register(PublishContentUseCase, { useClass: PublishContentUseCase });
  container.register(DeleteContentUseCase, { useClass: DeleteContentUseCase });
  container.register(RegisterUseCase, { useClass: RegisterUseCase });
  container.register(LoginUseCase, { useClass: LoginUseCase });
}

export { container };
