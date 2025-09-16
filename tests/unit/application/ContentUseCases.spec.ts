import "reflect-metadata";
import { CreateContentUseCase } from "../../../src/application/use-cases/content/CreateContentUseCase";
import { PublishContentUseCase } from "../../../src/application/use-cases/content/ContentUseCases";
import { IContentRepository } from "../../../src/domain/repositories/IContentRepository";
import { IAuthorRepository } from "../../../src/domain/repositories/IAuthorRepository";
import { Author, AuthorRole } from "../../../src/domain/entities/Author";
import { Content } from "../../../src/domain/entities/Content";
import { ContentStatus } from "../../../src/domain/value-objects/ContentStatus";
import { NotFoundError, ConflictError, ForbiddenError } from "../../../src/domain/errors/DomainError";


function makeAuthor(overrides: Partial<Parameters<typeof Author.reconstitute>[0]> = {}): Author {
  return Author.reconstitute({
    id: "author-1",
    name: "João Silva",
    email: "joao@test.com",
    passwordHash: "hash",
    role: AuthorRole.AUTHOR,
    bio: null,
    avatarUrl: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

function makeContent(overrides: Partial<Parameters<typeof Content.reconstitute>[0]> = {}): Content {
  return Content.reconstitute({
    id: "content-1",
    title: "Meu Artigo",
    slug: "meu-artigo",
    body: "Corpo do artigo com conteúdo suficiente aqui.",
    excerpt: null,
    status: ContentStatus.DRAFT,
    authorId: "author-1",
    categoryId: null,
    tags: [],
    metadata: {},
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}


function makeContentRepo(overrides: Partial<IContentRepository> = {}): IContentRepository {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findBySlug: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 10, totalPages: 0, hasNext: false, hasPrev: false }),
    save: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    existsBySlug: jest.fn().mockResolvedValue(false),
    countByAuthor: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
}

function makeAuthorRepo(overrides: Partial<IAuthorRepository> = {}): IAuthorRepository {
  const author = makeAuthor();
  return {
    findById: jest.fn().mockResolvedValue(author),
    findByEmail: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    save: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    existsByEmail: jest.fn().mockResolvedValue(false),
    ...overrides,
  };
}

describe("CreateContentUseCase", () => {
  it("should create content successfully", async () => {
    const contentRepo = makeContentRepo();
    const authorRepo = makeAuthorRepo();
    const useCase = new CreateContentUseCase(contentRepo, authorRepo);

    const result = await useCase.execute({
      input: {
        title: "Meu Artigo de Teste",
        body: "Corpo do artigo com conteúdo.",
        tags: ["typescript", "clean-architecture"],
      },
      requesterId: "author-1",
    });

    expect(result.id).toBeDefined();
    expect(result.title).toBe("Meu Artigo de Teste");
    expect(result.status).toBe(ContentStatus.DRAFT);
    expect(result.slug).toBe("meu-artigo-de-teste");
    expect(contentRepo.save).toHaveBeenCalledTimes(1);
  });

  it("should use provided slug when given", async () => {
    const useCase = new CreateContentUseCase(makeContentRepo(), makeAuthorRepo());

    const result = await useCase.execute({
      input: { title: "Any Title", body: "Body content", slug: "my-custom-slug" },
      requesterId: "author-1",
    });

    expect(result.slug).toBe("my-custom-slug");
  });

  it("should throw NotFoundError when author does not exist", async () => {
    const authorRepo = makeAuthorRepo({ findById: jest.fn().mockResolvedValue(null) });
    const useCase = new CreateContentUseCase(makeContentRepo(), authorRepo);

    await expect(
      useCase.execute({ input: { title: "Title", body: "Body" }, requesterId: "nonexistent" })
    ).rejects.toThrow(NotFoundError);
  });

  it("should throw ConflictError when slug already exists", async () => {
    const contentRepo = makeContentRepo({ existsBySlug: jest.fn().mockResolvedValue(true) });
    const useCase = new CreateContentUseCase(contentRepo, makeAuthorRepo());

    await expect(
      useCase.execute({ input: { title: "Title", body: "Body" }, requesterId: "author-1" })
    ).rejects.toThrow(ConflictError);
  });
});

describe("PublishContentUseCase", () => {
  it("should publish content owned by requester", async () => {
    const content = makeContent();
    const contentRepo = makeContentRepo({ findById: jest.fn().mockResolvedValue(content) });
    const useCase = new PublishContentUseCase(contentRepo, makeAuthorRepo());

    const result = await useCase.execute({ contentId: "content-1", requesterId: "author-1" });

    expect(result.status).toBe(ContentStatus.PUBLISHED);
    expect(contentRepo.update).toHaveBeenCalledTimes(1);
  });

  it("should allow admin to publish any content", async () => {
    const adminAuthor = makeAuthor({ id: "admin-1", role: AuthorRole.ADMIN });
    const content = makeContent({ authorId: "other-author" });

    const contentRepo = makeContentRepo({ findById: jest.fn().mockResolvedValue(content) });
    const authorRepo = makeAuthorRepo({ findById: jest.fn().mockResolvedValue(adminAuthor) });
    const useCase = new PublishContentUseCase(contentRepo, authorRepo);

    const result = await useCase.execute({ contentId: "content-1", requesterId: "admin-1" });
    expect(result.status).toBe(ContentStatus.PUBLISHED);
  });

  it("should throw ForbiddenError when author tries to publish another author content", async () => {
    const content = makeContent({ authorId: "different-author" });
    const contentRepo = makeContentRepo({ findById: jest.fn().mockResolvedValue(content) });
    const useCase = new PublishContentUseCase(contentRepo, makeAuthorRepo());

    await expect(
      useCase.execute({ contentId: "content-1", requesterId: "author-1" })
    ).rejects.toThrow(ForbiddenError);
  });

  it("should throw NotFoundError when content does not exist", async () => {
    const useCase = new PublishContentUseCase(makeContentRepo(), makeAuthorRepo());

    await expect(
      useCase.execute({ contentId: "nonexistent", requesterId: "author-1" })
    ).rejects.toThrow(NotFoundError);
  });
});
