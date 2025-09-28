import "reflect-metadata";
import { RegisterUseCase, LoginUseCase } from "../../../src/application/use-cases/auth/AuthUseCases";
import { IAuthorRepository } from "../../../src/domain/repositories/IAuthorRepository";
import { IHashService, ITokenService } from "../../../src/application/ports/services";
import { Author, AuthorRole } from "../../../src/domain/entities/Author";
import { ConflictError, UnauthorizedError } from "../../../src/domain/errors/DomainError";

function makeAuthor(): Author {
  return Author.reconstitute({
    id: "author-1",
    name: "Test User",
    email: "test@example.com",
    passwordHash: "hashed-password",
    role: AuthorRole.AUTHOR,
    bio: null,
    avatarUrl: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function makeAuthorRepo(overrides: Partial<IAuthorRepository> = {}): IAuthorRepository {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findByEmail: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    save: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    existsByEmail: jest.fn().mockResolvedValue(false),
    ...overrides,
  };
}

function makeHashService(overrides: Partial<IHashService> = {}): IHashService {
  return {
    hash: jest.fn().mockResolvedValue("hashed-password"),
    compare: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function makeTokenService(overrides: Partial<ITokenService> = {}): ITokenService {
  return {
    sign: jest.fn().mockReturnValue("jwt-token-mock"),
    verify: jest.fn().mockReturnValue({ sub: "author-1", email: "test@example.com", role: "AUTHOR" }),
    ...overrides,
  };
}

describe("RegisterUseCase", () => {
  it("should register a new author and return a token", async () => {
    const useCase = new RegisterUseCase(makeAuthorRepo(), makeHashService(), makeTokenService());

    const result = await useCase.execute({
      name: "New Author",
      email: "new@example.com",
      password: "StrongPass123",
    });

    expect(result.token).toBe("jwt-token-mock");
    expect(result.author.email).toBe("new@example.com");
    expect(result.author.role).toBe(AuthorRole.AUTHOR);
  });

  it("should hash the password before saving", async () => {
    const hashService = makeHashService();
    const authorRepo = makeAuthorRepo();
    const useCase = new RegisterUseCase(authorRepo, hashService, makeTokenService());

    await useCase.execute({ name: "Dev", email: "dev@example.com", password: "PlainPass123" });

    expect(hashService.hash).toHaveBeenCalledWith("PlainPass123");
    expect(authorRepo.save).toHaveBeenCalledTimes(1);
  });

  it("should throw ConflictError when email already exists", async () => {
    const authorRepo = makeAuthorRepo({ existsByEmail: jest.fn().mockResolvedValue(true) });
    const useCase = new RegisterUseCase(authorRepo, makeHashService(), makeTokenService());

    await expect(
      useCase.execute({ name: "Dev", email: "existing@example.com", password: "Pass123" })
    ).rejects.toThrow(ConflictError);
  });
});

describe("LoginUseCase", () => {
  it("should login with valid credentials and return token", async () => {
    const author = makeAuthor();
    const authorRepo = makeAuthorRepo({ findByEmail: jest.fn().mockResolvedValue(author) });
    const useCase = new LoginUseCase(authorRepo, makeHashService(), makeTokenService());

    const result = await useCase.execute({
      email: "test@example.com",
      password: "CorrectPassword",
    });

    expect(result.token).toBe("jwt-token-mock");
    expect(result.author.id).toBe("author-1");
  });

  it("should throw UnauthorizedError when email not found", async () => {
    const useCase = new LoginUseCase(makeAuthorRepo(), makeHashService(), makeTokenService());

    await expect(
      useCase.execute({ email: "unknown@example.com", password: "AnyPass" })
    ).rejects.toThrow(UnauthorizedError);
  });

  it("should throw UnauthorizedError when password does not match", async () => {
    const author = makeAuthor();
    const authorRepo = makeAuthorRepo({ findByEmail: jest.fn().mockResolvedValue(author) });
    const hashService = makeHashService({ compare: jest.fn().mockResolvedValue(false) });
    const useCase = new LoginUseCase(authorRepo, hashService, makeTokenService());

    await expect(
      useCase.execute({ email: "test@example.com", password: "WrongPassword" })
    ).rejects.toThrow(UnauthorizedError);
  });

  it("should throw UnauthorizedError when account is inactive", async () => {
    const inactiveAuthor = Author.reconstitute({
      id: "author-2", name: "Inactive", email: "inactive@example.com",
      passwordHash: "hash", role: AuthorRole.AUTHOR, bio: null,
      avatarUrl: null, isActive: false, createdAt: new Date(), updatedAt: new Date(),
    });
    const authorRepo = makeAuthorRepo({ findByEmail: jest.fn().mockResolvedValue(inactiveAuthor) });
    const useCase = new LoginUseCase(authorRepo, makeHashService(), makeTokenService());

    await expect(
      useCase.execute({ email: "inactive@example.com", password: "AnyPass" })
    ).rejects.toThrow(UnauthorizedError);
  });
});