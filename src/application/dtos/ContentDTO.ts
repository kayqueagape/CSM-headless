import { z } from "zod";

export const CreateContentSchema = z.object({
  title: z.string().min(3).max(255),
  slug: z.string().min(2).max(200).optional(),
  body: z.string().min(1),
  excerpt: z.string().max(500).optional(),
  categoryId: z.string().uuid().optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateContentSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  body: z.string().min(1).optional(),
  excerpt: z.string().max(500).nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const ListContentSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  authorId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  tags: z.string().optional(),
  search: z.string().optional(),
});

export type CreateContentInput = z.infer<typeof CreateContentSchema>;
export type UpdateContentInput = z.infer<typeof UpdateContentSchema>;
export type ListContentInput = z.infer<typeof ListContentSchema>;

// ─── Output DTOs ─────────────────────────────────────────────────────────────

export interface ContentDTO {
  id: string;
  title: string;
  slug: string;
  body: string;
  excerpt: string | null;
  status: string;
  authorId: string;
  categoryId: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedContentDTO {
  data: ContentDTO[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
