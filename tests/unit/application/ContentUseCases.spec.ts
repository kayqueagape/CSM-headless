import "reflect-metadata";
import { CreateContentUseCase } from "../../../src/application/use-cases/content/CreateContentUseCase";
import {
  GetContentByIdUseCase,
  GetContentBySlugUseCase,
  ListContentsUseCase,
  UpdateContentUseCase,
  PublishContentUseCase,
  DeleteContentUseCase,
} from "../../../src/application/use-cases/content/ContentUseCases";
import { IContentRepository } from "../../../src/domain/repositories/IContentRepository";
import { IAuthorRepository } from "../../../src/domain/repositories/IAuthorRepository";
import { Author, AuthorRole } from "../../../src/domain/entities/Author";
import { Content } from "../../../src/domain/entities/Content";
import { ContentStatus } from "../../../src/domain/value-objects/ContentStatus";
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from "../../../src/domain/errors/DomainError";


function makeAuthor(overrides: Partial<Parameters<typeof Author.reconstitute>[0]> = {}): Author {
  return Author.reconstitute({
    id: "author-1",
    name: "Joao Silva",
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
    title: "My Article",
    slug: "my-article",
    body: "Article body with enough content here.",
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
    findAll: jest.fn().mockResolvedValue({
      data: [], total: 0, page: 1, limit: 10, totalPages: 0, hasNext: false, hasPrev: false,
    }),
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
    const useCase = new CreateContentUseCase(makeContentRepo(), makeAuthorRepo());

    const result = await useCase.execute({
      input: { title: "My Test Article", body: "Body content here." },
      requesterId: "author-1",
    });

    expect(result.id).toBeDefined();
    expect(result.title).toBe("My Test Article");
    expect(result.status).toBe(ContentStatus.DRAFT);
    expect(result.slug).toBe("my-test-article");
  });

  it("should use provided slug when given", async () => {
    const useCase = new CreateContentUseCase(makeContentRepo(), makeAuthorRepo());

    const result = await useCase.execute({
      input: { title: "Any Title", body: "Body", slug: "my-custom-slug" },
      requesterId: "author-1",
    });

    expect(result.slug).toBe("my-custom-slug");
  });

  it("should throw NotFoundError when author does not exist", async () => {
    const authorRepo = makeAuthorRepo({ findById: jest.fn().mockResolvedValue(null) });
    const useCase = new CreateContentUseCase(makeContentRepo(), authorRepo);

    await expect(
      useCase.execute({ input: { title: "Title", body: "Body" }, requesterId: "no-such-author" })
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

describe("GetContentByIdUseCase", () => {
  it("should return content by id", async () => {
    const content = makeContent();
    const contentRepo = makeContentRepo({ findById: jest.fn().mockResolvedValue(content) });
    const useCase = new GetContentByIdUseCase(contentRepo);

    const result = await useCase.execute(content.id);
    expect(result.id).toBe(content.id);
  });

  it("should throw NotFoundError for nonexistent id", async () => {
    const useCase = new GetContentByIdUseCase(makeContentRepo());
    await expect(useCase.execute("no-such-id")).rejects.toThrow(NotFoundError);
  });
});

describe("GetContentBySlugUseCase", () => {
  it("should return content by slug", async () => {
    const content = makeContent({ slug: "my-slug" });
    const contentRepo = makeContentRepo({ findBySlug: jest.fn().mockResolvedValue(content) });
    const useCase = new GetContentBySlugUseCase(contentRepo);

    const result = await useCase.execute("my-slug");
    expect(result.slug).toBe("my-slug");
  });

  it("should throw NotFoundError for nonexistent slug", async () => {
    const useCase = new GetContentBySlugUseCase(makeContentRepo());
    await expect(useCase.execute("no-such-slug")).rejects.toThrow(NotFoundError);
  });
});

describe("ListContentsUseCase", () => {
  it("should return paginated list", async () => {
    const content = makeContent();
    const contentRepo = makeContentRepo({
      findAll: jest.fn().mockResolvedValue({
        data: [content], total: 1, page: 1, limit: 10, totalPages: 1, hasNext: false, hasPrev: false,
      }),
    });
    const useCase = new ListContentsUseCase(contentRepo);

    const result = await useCase.execute({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it("should pass filters correctly", async () => {
    const contentRepo = makeContentRepo();
    const useCase = new ListContentsUseCase(contentRepo);

    await useCase.execute({
      page: 1, limit: 10,
      status: "PUBLISHED",
      authorId: "author-1",
      tags: "typescript,nodejs",
    });

    expect(contentRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: "PUBLISHED", authorId: "author-1" }),
      { page: 1, limit: 10 }
    );
  });
});

describe("UpdateContentUseCase", () => {
  it("should update content when requester is the owner", async () => {
    const content = makeContent();
    const contentRepo = makeContentRepo({ findById: jest.fn().mockResolvedValue(content) });
    const useCase = new UpdateContentUseCase(contentRepo, makeAuthorRepo());

    const result = await useCase.execute({
      contentId: "content-1",
      input: { title: "Updated Title Here" },
      requesterId: "author-1",
    });

    expect(result.title).toBe("Updated Title Here");
    expect(contentRepo.update).toHaveBeenCalledTimes(1);
  });

  it("should throw ForbiddenError when requester does not own content", async () => {
    const content = makeContent({ authorId: "other-author" });
    const contentRepo = makeContentRepo({ findById: jest.fn().mockResolvedValue(content) });
    const useCase = new UpdateContentUseCase(contentRepo, makeAuthorRepo());

    await expect(
      useCase.execute({ contentId: "content-1", input: { title: "X" }, requesterId: "author-1" })
    ).rejects.toThrow(ForbiddenError);
  });

  it("should throw NotFoundError when content does not exist", async () => {
    const useCase = new UpdateContentUseCase(makeContentRepo(), makeAuthorRepo());
    await expect(
      useCase.execute({ contentId: "ghost", input: {}, requesterId: "author-1" })
    ).rejects.toThrow(NotFoundError);
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
    const admin = makeAuthor({ id: "admin-1", role: AuthorRole.ADMIN });
    const content = makeContent({ authorId: "other-author" });
    const contentRepo = makeContentRepo({ findById: jest.fn().mockResolvedValue(content) });
    const authorRepo = makeAuthorRepo({ findById: jest.fn().mockResolvedValue(admin) });
    const useCase = new PublishContentUseCase(contentRepo, authorRepo);

    const result = await useCase.execute({ contentId: "content-1", requesterId: "admin-1" });
    expect(result.status).toBe(ContentStatus.PUBLISHED);
  });

  it("should throw ForbiddenError when AUTHOR tries to publish another author content", async () => {
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

describe("DeleteContentUseCase", () => {
  it("should delete a draft content owned by requester", async () => {
    const content = makeContent();
    const contentRepo = makeContentRepo({ findById: jest.fn().mockResolvedValue(content) });
    const useCase = new DeleteContentUseCase(contentRepo, makeAuthorRepo());

    await expect(useCase.execute("content-1", "author-1")).resolves.toBeUndefined();
    expect(contentRepo.delete).toHaveBeenCalledWith("content-1");
  });

  it("should throw ForbiddenError when non-admin tries to delete published content", async () => {
    const content = makeContent();
    content.publish();
    const contentRepo = makeContentRepo({ findById: jest.fn().mockResolvedValue(content) });
    const useCase = new DeleteContentUseCase(contentRepo, makeAuthorRepo());

    await expect(useCase.execute("content-1", "author-1")).rejects.toThrow(ForbiddenError);
  });

  it("should allow admin to delete published content", async () => {
    const admin = makeAuthor({ id: "admin-1", role: AuthorRole.ADMIN });
    const content = makeContent();
    content.publish();
    const contentRepo = makeContentRepo({ findById: jest.fn().mockResolvedValue(content) });
    const authorRepo = makeAuthorRepo({ findById: jest.fn().mockResolvedValue(admin) });
    const useCase = new DeleteContentUseCase(contentRepo, authorRepo);

    await expect(useCase.execute("content-1", "admin-1")).resolves.toBeUndefined();
  });

  it("should throw NotFoundError when content does not exist", async () => {
    const useCase = new DeleteContentUseCase(makeContentRepo(), makeAuthorRepo());
    await expect(useCase.execute("no-content", "author-1")).rejects.toThrow(NotFoundError);
  });
});