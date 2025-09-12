import { injectable } from "tsyringe";
import { Author } from "../../../domain/entities/Author";
import { IAuthorRepository } from "../../../domain/repositories/IAuthorRepository";

@injectable()
export class InMemoryAuthorRepository implements IAuthorRepository {
  private readonly store = new Map<string, Author>();

  async findById(id: string): Promise<Author | null> {
    return this.store.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<Author | null> {
    for (const author of this.store.values()) {
      if (author.email === email.toLowerCase()) return author;
    }
    return null;
  }

  async findAll(page: number, limit: number): Promise<{ data: Author[]; total: number }> {
    const items = Array.from(this.store.values());
    const total = items.length;
    const data = items.slice((page - 1) * limit, page * limit);
    return { data, total };
  }

  async save(author: Author): Promise<void> {
    this.store.set(author.id, author);
  }

  async update(author: Author): Promise<void> {
    this.store.set(author.id, author);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async existsByEmail(email: string): Promise<boolean> {
    for (const author of this.store.values()) {
      if (author.email === email.toLowerCase()) return true;
    }
    return false;
  }

  clear(): void { this.store.clear(); }
}
