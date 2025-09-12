import { injectable } from "tsyringe";
import { Category } from "../../../domain/entities/Category";
import { ICategoryRepository } from "../../../domain/repositories/ICategoryRepository";

@injectable()
export class InMemoryCategoryRepository implements ICategoryRepository {
  private readonly store = new Map<string, Category>();

  async findById(id: string): Promise<Category | null> {
    return this.store.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    for (const c of this.store.values()) {
      if (c.slug === slug) return c;
    }
    return null;
  }

  async findAll(): Promise<Category[]> {
    return Array.from(this.store.values());
  }

  async findChildren(parentId: string): Promise<Category[]> {
    return Array.from(this.store.values()).filter(c => c.parentId === parentId);
  }

  async save(category: Category): Promise<void> {
    this.store.set(category.id, category);
  }

  async update(category: Category): Promise<void> {
    this.store.set(category.id, category);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
    for (const c of this.store.values()) {
      if (c.slug === slug && c.id !== excludeId) return true;
    }
    return false;
  }
}
