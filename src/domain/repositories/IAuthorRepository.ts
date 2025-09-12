import { Author } from "../entities/Author";

export interface IAuthorRepository {
  findById(id: string): Promise<Author | null>;
  findByEmail(email: string): Promise<Author | null>;
  findAll(page: number, limit: number): Promise<{ data: Author[]; total: number }>;
  save(author: Author): Promise<void>;
  update(author: Author): Promise<void>;
  delete(id: string): Promise<void>;
  existsByEmail(email: string): Promise<boolean>;
}
