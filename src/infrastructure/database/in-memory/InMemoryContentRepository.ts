import { injectable } from "tsyringe";
import { Content } from "../../../domain/entities/Content";
import {
  IContentRepository,
  ContentFilters,
  PaginationOptions,
  PaginatedResult,
} from "../../../domain/repositories/IContentRepository";

@injectable()
export class InMemoryContentRepository implements IContentRepository {
  private readonly store = new Map<string, Content>();

  async findById(id: string): Promise<Content | null> {
    return this.store.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<Content | null> {
    for (const content of this.store.values()) {
      if (content.slug === slug) return content;
    }
    return null;
  }

  async findAll(
    filters: ContentFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Content>> {
    let items = Array.from(this.store.values());

    if (filters.status) {
      items = items.filter(c => c.status === filters.status);
    }
    if (filters.authorId) {
      items = items.filter(c => c.authorId === filters.authorId);
    }
    if (filters.categoryId) {
      items = items.filter(c => c.categoryId === filters.categoryId);
    }
    if (filters.tags && filters.tags.length > 0) {
      items = items.filter(c =>
        filters.tags!.every(tag => c.tags.includes(tag))
      );
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      items = items.filter(
        c =>
          c.title.toLowerCase().includes(search) ||
          c.body.toLowerCase().includes(search)
      );
    }

    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = items.length;
    const { page, limit } = pagination;
    const start = (page - 1) * limit;
    const data = items.slice(start, start + limit);
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async save(content: Content): Promise<void> {
    this.store.set(content.id, content);
  }

  async update(content: Content): Promise<void> {
    this.store.set(content.id, content);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
    for (const content of this.store.values()) {
      if (content.slug === slug && content.id !== excludeId) return true;
    }
    return false;
  }

  async countByAuthor(authorId: string): Promise<number> {
    let count = 0;
    for (const content of this.store.values()) {
      if (content.authorId === authorId) count++;
    }
    return count;
  }

  // Utility for tests
  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}
