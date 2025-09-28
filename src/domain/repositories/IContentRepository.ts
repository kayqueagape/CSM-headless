import { Content } from "../entities/Content";
import { ContentStatus } from "../value-objects/ContentStatus";

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ContentFilters {
  status?: ContentStatus;
  authorId?: string;
  categoryId?: string;
  tags?: string[];
  search?: string;
}

export interface IContentRepository {
  findById(id: string): Promise<Content | null>;
  findBySlug(slug: string): Promise<Content | null>;
  findAll(
    filters: ContentFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Content>>;
  save(content: Content): Promise<void>;
  update(content: Content): Promise<void>;
  delete(id: string): Promise<void>;
  existsBySlug(slug: string, excludeId?: string): Promise<boolean>;
  countByAuthor(authorId: string): Promise<number>;
}
