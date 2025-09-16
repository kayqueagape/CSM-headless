import { ContentSlug } from "../../../src/domain/value-objects/ContentSlug";
import { Email } from "../../../src/domain/value-objects/Email";
import { DomainError } from "../../../src/domain/errors/DomainError";

describe("ContentSlug Value Object", () => {
  it("should create a valid slug", () => {
    const slug = ContentSlug.create("my-valid-slug");
    expect(slug.value).toBe("my-valid-slug");
  });

  it("should normalize to lowercase", () => {
    const slug = ContentSlug.create("my-slug");
    expect(slug.value).toBe("my-slug");
  });

  it("should throw for slug with spaces", () => {
    expect(() => ContentSlug.create("invalid slug")).toThrow(DomainError);
  });

  it("should throw for slug with special chars", () => {
    expect(() => ContentSlug.create("slug@invalid!")).toThrow(DomainError);
  });

  it("should throw for empty slug", () => {
    expect(() => ContentSlug.create(")).toThrow(DomainError);
  });

  it("should generate slug from title", () => {
    const slug = ContentSlug.fromTitle("Minha Postagem Incrível");
    expect(slug.value).toBe("minha-postagem-incrivel");
  });

  it("should generate slug from title with accents", () => {
    const slug = ContentSlug.fromTitle("Arquitetura Limpa com TypeScript");
    expect(slug.value).toBe("arquitetura-limpa-com-typescript");
  });

  it("should compare equality", () => {
    const a = ContentSlug.create("my-slug");
    const b = ContentSlug.create("my-slug");
    const c = ContentSlug.create("other-slug");

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});

describe("Email Value Object", () => {
  it("should create valid email", () => {
    const email = Email.create("user@example.com");
    expect(email.value).toBe("user@example.com");
  });

  it("should normalize to lowercase", () => {
    const email = Email.create("User@EXAMPLE.COM");
    expect(email.value).toBe("user@example.com");
  });

  it("should extract domain", () => {
    const email = Email.create("user@domain.com.br");
    expect(email.domain).toBe("domain.com.br");
  });

  it("should throw for invalid email", () => {
    expect(() => Email.create("not-an-email")).toThrow(DomainError);
    expect(() => Email.create("@no-local.com")).toThrow(DomainError);
    expect(() => Email.create("no@domain")).toThrow(DomainError);
  });

  it("should compare equality", () => {
    const a = Email.create("same@email.com");
    const b = Email.create("SAME@EMAIL.COM");
    const c = Email.create("other@email.com");

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
