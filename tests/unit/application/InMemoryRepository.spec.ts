import "reflect-metadata";
import { InMemoryContentRepository } from "../../../src/infrastructure/database/in-memory/InMemoryContentRepository";
import { Content } from "../../../src/domain/entities/Content";
import { ContentStatus } from "../../../src/domain/value-objects/ContentStatus";

let slugCounter = 0;

describe("InMemoryContentRepository", () => {
  let repo: InMemoryContentRepository;

  beforeEach(() => {
    repo = new InMemoryContentRepository();
    slugCounter = 0;
  });

  function makeContent(overrides: Partial<{ title: string; slug: string; authorId: string }> = {}): Content {
    const idx = ++slugCounter;
    return Content.create({
      title: overrides.title ?? "Test Article",
      slug: overrides.slug ?? `test-article-${idx}`,
      body: "Body content for testing purposes",
      authorId: overrides.authorId ?? "author-1",
    });
  }

  it("should save and find content by id", async () => {
    const content = makeContent();
    await repo.save(content);

    const found = await repo.findById(content.id);
    expect(found?.id).toBe(content.id);
    expect(found?.title).toBe("Test Article");
  });

  it("should return null for nonexistent id", async () => {
    const result = await repo.findById("nonexistent-id");
    expect(result).toBeNull();
  });

  it("should find content by slug", async () => {
    const content = makeContent({ slug: "unique-slug" });
    await repo.save(content);

    const found = await repo.findBySlug("unique-slug");
    expect(found?.id).toBe(content.id);
  });

  it("should check slug existence", async () => {
    const content = makeContent({ slug: "existing-slug" });
    await repo.save(content);

    expect(await repo.existsBySlug("existing-slug")).toBe(true);
    expect(await repo.existsBySlug("nonexistent-slug")).toBe(false);
  });

  it("should exclude id when checking slug existence", async () => {
    const content = makeContent({ slug: "my-slug" });
    await repo.save(content);

    const exists = await repo.existsBySlug("my-slug", content.id);
    expect(exists).toBe(false);
  });

  it("should paginate results", async () => {
    for (let i = 0; i < 15; i++) {
      await repo.save(makeContent({ slug: `article-${i}`, title: `Article ${i}` }));
    }

    const page1 = await repo.findAll({}, { page: 1, limit: 10 });
    const page2 = await repo.findAll({}, { page: 2, limit: 10 });

    expect(page1.data).toHaveLength(10);
    expect(page2.data).toHaveLength(5);
    expect(page1.total).toBe(15);
    expect(page1.totalPages).toBe(2);
    expect(page1.hasNext).toBe(true);
    expect(page1.hasPrev).toBe(false);
    expect(page2.hasPrev).toBe(true);
    expect(page2.hasNext).toBe(false);
  });

  it("should filter by status", async () => {
    const draft = makeContent({ slug: "draft-article" });
    const published = makeContent({ slug: "published-article" });
    published.publish();

    await repo.save(draft);
    await repo.save(published);

    const drafts = await repo.findAll(
      { status: ContentStatus.DRAFT },
      { page: 1, limit: 10 }
    );
    const publishedItems = await repo.findAll(
      { status: ContentStatus.PUBLISHED },
      { page: 1, limit: 10 }
    );

    expect(drafts.data.every(c => c.status === ContentStatus.DRAFT)).toBe(true);
    expect(publishedItems.data.every(c => c.status === ContentStatus.PUBLISHED)).toBe(true);
  });

  it("should filter by tags", async () => {
    const ts = makeContent({ slug: "ts-article" });
    ts.addTag("typescript");
    ts.addTag("backend");

    const js = makeContent({ slug: "js-article" });
    js.addTag("javascript");

    await repo.save(ts);
    await repo.save(js);

    const result = await repo.findAll(
      { tags: ["typescript"] },
      { page: 1, limit: 10 }
    );

    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.slug).toBe("ts-article");
  });

  it("should search by title", async () => {
    await repo.save(makeContent({ slug: "clean-arch", title: "Clean Architecture Guide" }));
    await repo.save(makeContent({ slug: "ddd-guide", title: "Domain Driven Design" }));

    const result = await repo.findAll(
      { search: "clean" },
      { page: 1, limit: 10 }
    );

    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.title).toBe("Clean Architecture Guide");
  });

  it("should update content", async () => {
    const content = makeContent();
    await repo.save(content);

    content.update({ title: "Updated Title" });
    await repo.update(content);

    const found = await repo.findById(content.id);
    expect(found?.title).toBe("Updated Title");
  });

  it("should delete content", async () => {
    const content = makeContent();
    await repo.save(content);
    await repo.delete(content.id);

    const found = await repo.findById(content.id);
    expect(found).toBeNull();
  });

  it("should count by author", async () => {
    await repo.save(makeContent({ slug: "a1", authorId: "author-x" }));
    await repo.save(makeContent({ slug: "a2", authorId: "author-x" }));
    await repo.save(makeContent({ slug: "a3", authorId: "author-y" }));

    expect(await repo.countByAuthor("author-x")).toBe(2);
    expect(await repo.countByAuthor("author-y")).toBe(1);
    expect(await repo.countByAuthor("author-z")).toBe(0);
  });
});
