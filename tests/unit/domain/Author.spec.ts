import { Author, AuthorRole } from "../../../src/domain/entities/Author";
import { DomainError } from "../../../src/domain/errors/DomainError";

describe("Author Entity", () => {
  const validProps = {
    name: "Maria Desenvolvedora",
    email: "maria@example.com",
    passwordHash: "$2b$12$hashed",
  };

  describe("create()", () => {
    it("should create author with AUTHOR role by default", () => {
      const author = Author.create(validProps);

      expect(author.id).toBeDefined();
      expect(author.name).toBe(validProps.name);
      expect(author.email).toBe(validProps.email);
      expect(author.role).toBe(AuthorRole.AUTHOR);
      expect(author.isActive).toBe(true);
    });

    it("should normalize email to lowercase", () => {
      const author = Author.create({ ...validProps, email: "MARIA@EXAMPLE.COM" });
      expect(author.email).toBe("maria@example.com");
    });

    it("should throw for invalid email", () => {
      expect(() =>
        Author.create({ ...validProps, email: "not-an-email" })
      ).toThrow(DomainError);
    });

    it("should throw for name shorter than 2 chars", () => {
      expect(() =>
        Author.create({ ...validProps, name: "A" })
      ).toThrow(DomainError);
    });
  });

  describe("promote()", () => {
    it("should allow admin to promote user to editor", () => {
      const admin = Author.reconstitute({
        id: "admin-1", name: "Admin", email: "admin@example.com",
        passwordHash: "hash", role: AuthorRole.ADMIN, bio: null,
        avatarUrl: null, isActive: true, createdAt: new Date(), updatedAt: new Date(),
      });
      const author = Author.create(validProps);

      author.promote(AuthorRole.EDITOR, admin);
      expect(author.role).toBe(AuthorRole.EDITOR);
    });

    it("should throw when non-admin tries to promote", () => {
      const editor = Author.reconstitute({
        id: "editor-1", name: "Editor", email: "editor@example.com",
        passwordHash: "hash", role: AuthorRole.EDITOR, bio: null,
        avatarUrl: null, isActive: true, createdAt: new Date(), updatedAt: new Date(),
      });
      const author = Author.create(validProps);

      expect(() => author.promote(AuthorRole.EDITOR, editor)).toThrow(DomainError);
    });
  });

  describe("deactivate()", () => {
    it("should deactivate an active author", () => {
      const author = Author.create(validProps);
      author.deactivate();

      expect(author.isActive).toBe(false);
    });

    it("should throw when deactivating an already inactive author", () => {
      const author = Author.create(validProps);
      author.deactivate();

      expect(() => author.deactivate()).toThrow(DomainError);
    });
  });

  describe("canManageContent()", () => {
    it("should allow owner to manage their content", () => {
      const author = Author.reconstitute({
        id: "author-1", name: "Author", email: "a@b.com", passwordHash: "h",
        role: AuthorRole.AUTHOR, bio: null, avatarUrl: null, isActive: true,
        createdAt: new Date(), updatedAt: new Date(),
      });

      expect(author.canManageContent("author-1")).toBe(true);
      expect(author.canManageContent("other-author")).toBe(false);
    });

    it("should allow ADMIN to manage any content", () => {
      const admin = Author.reconstitute({
        id: "admin-1", name: "Admin", email: "admin@b.com", passwordHash: "h",
        role: AuthorRole.ADMIN, bio: null, avatarUrl: null, isActive: true,
        createdAt: new Date(), updatedAt: new Date(),
      });

      expect(admin.canManageContent("any-author-id")).toBe(true);
    });
  });
});
