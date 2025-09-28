import { Category } from "../../../src/domain/entities/Category";
import { DomainError } from "../../../src/domain/errors/DomainError";

describe("Category Entity", () => {
  const validProps = {
    name: "Technology",
    slug: "technology",
    description: "Tech articles",
  };

  it("should create a category", () => {
    const category = Category.create(validProps);
    expect(category.id).toBeDefined();
    expect(category.name).toBe("Technology");
    expect(category.slug).toBe("technology");
    expect(category.parentId).toBeNull();
  });

  it("should throw for name shorter than 2 chars", () => {
    expect(() => Category.create({ ...validProps, name: "A" })).toThrow(DomainError);
  });

  it("should create category with parent", () => {
    const child = Category.create({ ...validProps, slug: "nodejs", name: "NodeJS", parentId: "parent-uuid" });
    expect(child.parentId).toBe("parent-uuid");
  });

  it("should update category name and description", () => {
    const category = Category.create(validProps);
    category.update({ name: "Tech & Science", description: "Updated description" });
    expect(category.name).toBe("Tech & Science");
    expect(category.description).toBe("Updated description");
  });

  it("should reconstitute from primitives", () => {
    const now = new Date();
    const category = Category.reconstitute({
      id: "cat-1", name: "Technology", slug: "technology",
      description: "Tech", parentId: null, createdAt: now, updatedAt: now,
    });
    expect(category.id).toBe("cat-1");
    expect(category.toPrimitives().id).toBe("cat-1");
  });
});