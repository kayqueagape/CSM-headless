import { injectable } from 'tsyringe';
import { Pool } from 'pg';
import { Content } from '../../../domain/entities/Content';
import { ContentStatus } from '../../../domain/value-objects/ContentStatus';
import {
  IContentRepository,
  ContentFilters,
  PaginationOptions,
  PaginatedResult,
} from '../../../domain/repositories/IContentRepository';
import { env } from '../../config/env';

/**
 * PgContentRepository — Adapter PostgreSQL.
 * Toda a tradução entre mundo relacional e domínio fica aqui.
 * O domínio NUNCA sabe que existe um banco de dados.
 */
@injectable()
export class PgContentRepository implements IContentRepository {
  private readonly pool: Pool;

  constructor() {
    this.pool = new Pool({ connectionString: env.DATABASE_URL });
  }

  private mapRow(row: Record<string, unknown>): Content {
    return Content.reconstitute({
      id: row['id'] as string,
      title: row['title'] as string,
      slug: row['slug'] as string,
      body: row['body'] as string,
      excerpt: row['excerpt'] as string | undefined,
      status: row['status'] as ContentStatus,
      authorId: row['author_id'] as string,
      categoryId: row['category_id'] as string | undefined,
      tags: (row['tags'] as string[]) ?? [],
      metadata: (row['metadata'] as Record<string, unknown>) ?? {},
      publishedAt: row['published_at'] ? new Date(row['published_at'] as string) : undefined,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    });
  }

  async findById(id: string): Promise<Content | null> {
    const result = await this.pool.query(
      'SELECT * FROM contents WHERE id = $1',
      [id]
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findBySlug(slug: string): Promise<Content | null> {
    const result = await this.pool.query(
      'SELECT * FROM contents WHERE slug = $1',
      [slug]
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findAll(
    filters: ContentFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Content>> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (filters.status) {
      conditions.push(`status = $${paramIdx++}`);
      params.push(filters.status);
    }
    if (filters.authorId) {
      conditions.push(`author_id = $${paramIdx++}`);
      params.push(filters.authorId);
    }
    if (filters.categoryId) {
      conditions.push(`category_id = $${paramIdx++}`);
      params.push(filters.categoryId);
    }
    if (filters.tags?.length) {
      conditions.push(`tags @> $${paramIdx++}`);
      params.push(filters.tags);
    }
    if (filters.search) {
      conditions.push(
        `(to_tsvector('portuguese', title || ' ' || body) @@ plainto_tsquery('portuguese', $${paramIdx++}))`
      );
      params.push(filters.search);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (pagination.page - 1) * pagination.limit;

    const [countResult, dataResult] = await Promise.all([
      this.pool.query(`SELECT COUNT(*) FROM contents ${where}`, params),
      this.pool.query(
        `SELECT * FROM contents ${where} ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, pagination.limit, offset]
      ),
    ]);

    const total = parseInt(countResult.rows[0].count as string, 10);
    const totalPages = Math.ceil(total / pagination.limit);

    return {
      data: dataResult.rows.map(row => this.mapRow(row)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1,
    };
  }

  async save(content: Content): Promise<void> {
    const p = content.toPrimitives();
    await this.pool.query(
      `INSERT INTO contents
        (id, title, slug, body, excerpt, status, author_id, category_id, tags, metadata, published_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [p.id, p.title, p.slug, p.body, p.excerpt, p.status, p.authorId,
       p.categoryId, p.tags, JSON.stringify(p.metadata), p.publishedAt, p.createdAt, p.updatedAt]
    );
  }

  async update(content: Content): Promise<void> {
    const p = content.toPrimitives();
    await this.pool.query(
      `UPDATE contents SET
        title=$2, slug=$3, body=$4, excerpt=$5, status=$6, category_id=$7,
        tags=$8, metadata=$9, published_at=$10, updated_at=$11
       WHERE id=$1`,
      [p.id, p.title, p.slug, p.body, p.excerpt, p.status,
       p.categoryId, p.tags, JSON.stringify(p.metadata), p.publishedAt, p.updatedAt]
    );
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM contents WHERE id = $1', [id]);
  }

  async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
    const query = excludeId
      ? 'SELECT 1 FROM contents WHERE slug = $1 AND id != $2'
      : 'SELECT 1 FROM contents WHERE slug = $1';
    const params = excludeId ? [slug, excludeId] : [slug];
    const result = await this.pool.query(query, params);
    return result.rowCount !== null && result.rowCount > 0;
  }

  async countByAuthor(authorId: string): Promise<number> {
    const result = await this.pool.query(
      'SELECT COUNT(*) FROM contents WHERE author_id = $1',
      [authorId]
    );
    return parseInt(result.rows[0].count as string, 10);
  }
}
