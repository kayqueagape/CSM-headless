import { Content } from "../../domain/entities/Content";
import { ContentDTO } from "../dtos/ContentDTO";

export class ContentMapper {
  static toDTO(content: Content): ContentDTO {
    const p = content.toPrimitives();
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      body: p.body,
      excerpt: p.excerpt,
      status: p.status,
      authorId: p.authorId,
      categoryId: p.categoryId,
      tags: p.tags,
      metadata: p.metadata,
      publishedAt: p.publishedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}
