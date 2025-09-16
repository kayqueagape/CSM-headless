import { Content } from "../../../src/domain/entities/Content";
import { ContentStatus } from "../../../src/domain/value-objects/ContentStatus";
import { DomainError } from "../../../src/domain/errors/DomainError";

describe("Content Entity", () => {
  const validProps = {
    title: "Meu Artigo Incrível",
    slug: "meu-artigo-incrivel",
    body: "Este é o corpo do artigo com conteúdo suficiente.",
    authorId: "author-uuid-123",
  };

  describe("create()", () => {
    it("should create a content with DRAFT status", () => {
      const content = Content.create(validProps);

      expect(content.id).toBeDefined();
      expect(content.title).toBe(validProps.title);
      expect(content.status).toBe(ContentStatus.DRAFT);
      expect(content.isPublished()).toBe(false);
    });

    it("should throw when title is too short", () => {
      expect(() =>
        Content.create({ ...validProps, title: "Ab" })
      ).toThrow(DomainError);
    });

    it("should throw when title exceeds 255 chars", () => {
      expect(() =>
        Content.create({ ...validProps, title: "A".repeat(256) })
      ).toThrow(DomainError);
    });

    it("should throw when body is empty", () => {
      expect(() =>
        Content.create({ ...validProps, body: " })
      ).toThrow(DomainError);
    });

    it("should throw when slug is invalid", () => {
      expect(() =>
        Content.create({ ...validProps, slug: "Invalid Slug With Spaces!" })
      ).toThrow(DomainError);
    });
  });

  describe("publish()", () => {
    it("should publish a draft content", () => {
      const content = Content.create(validProps);
      content.publish();

      expect(content.status).toBe(ContentStatus.PUBLISHED);
      expect(content.isPublished()).toBe(true);
      expect(content.publishedAt).toBeDefined();
    });

    it("should throw when trying to publish an already published content", () => {
      const content = Content.create(validProps);
      content.publish();

      expect(() => content.publish()).toThrow(DomainError);
      expect(() => content.publish()).toThrow("already published");
    });
  });

  describe("unpublish()", () => {
    it("should unpublish a published content", () => {
      const content = Content.create(validProps);
      content.publish();
      content.unpublish();

      expect(content.status).toBe(ContentStatus.DRAFT);
      expect(content.publishedAt).toBeNull();
    });

    it("should throw when trying to unpublish a draft", () => {
      const content = Content.create(validProps);
      expect(() => content.unpublish()).toThrow(DomainError);
    });
  });

  describe("archive()", () => {
    it("should archive content", () => {
      const content = Content.create(validProps);
      content.archive();

      expect(content.status).toBe(ContentStatus.ARCHIVED);
    });

    it("should throw when trying to archive an already archived content", () => {
      const content = Content.create(validProps);
      content.archive();
      expect(() => content.archive()).toThrow(DomainError);
    });

    it("should throw when trying to update archived content", () => {
      const content = Content.create(validProps);
      content.archive();

      expect(() => content.update({ title: "New Title" })).toThrow(DomainError);
    });
  });

  describe("update()", () => {
    it("should update content fields", () => {
      const content = Content.create(validProps);
      content.update({ title: "Novo Título Atualizado" });

      expect(content.title).toBe("Novo Título Atualizado");
    });

    it("should update updatedAt timestamp", () => {
      const content = Content.create(validProps);
      const before = content.updatedAt;

      // Small delay to ensure different timestamp
      jest.useFakeTimers();
      jest.advanceTimersByTime(1000);
      content.update({ title: "Updated Title" });
      jest.useRealTimers();

      expect(content.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe("tag management", () => {
    it("should add tags", () => {
      const content = Content.create(validProps);
      content.addTag("TypeScript");
      content.addTag("clean-architecture");

      expect(content.tags).toContain("typescript");
      expect(content.tags).toContain("clean-architecture");
    });

    it("should not add duplicate tags", () => {
      const content = Content.create(validProps);
      content.addTag("typescript");
      content.addTag("TypeScript"); // duplicate, different case

      expect(content.tags.filter(t => t === "typescript")).toHaveLength(1);
    });

    it("should remove tags", () => {
      const content = Content.create({ ...validProps, tags: ["typescript", "nodejs"] });
      content.removeTag("typescript");

      expect(content.tags).not.toContain("typescript");
      expect(content.tags).toContain("nodejs");
    });
  });

  describe("ownership", () => {
    it("should correctly identify owner", () => {
      const content = Content.create(validProps);
      expect(content.isOwnedBy("author-uuid-123")).toBe(true);
      expect(content.isOwnedBy("other-author")).toBe(false);
    });
  });

  describe("toPrimitives()", () => {
    it("should return a plain object snapshot", () => {
      const content = Content.create(validProps);
      const primitives = content.toPrimitives();

      expect(primitives.id).toBe(content.id);
      expect(primitives.status).toBe(ContentStatus.DRAFT);
      expect(Array.isArray(primitives.tags)).toBe(true);
    });
  });
});
