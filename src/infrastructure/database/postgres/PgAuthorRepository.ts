import { injectable } from 'tsyringe';
import { Pool } from 'pg';
import { Author, AuthorRole } from '../../../domain/entities/Author';
import { IAuthorRepository } from '../../../domain/repositories/IAuthorRepository';
import { env } from '../../config/env';

@injectable()
export class PgAuthorRepository implements IAuthorRepository {
  private readonly pool: Pool;

  constructor() {
    this.pool = new Pool({ connectionString: env.DATABASE_URL });
  }

  private mapRow(row: Record<string, unknown>): Author {
    return Author.reconstitute({
      id: row['id'] as string,
      name: row['name'] as string,
      email: row['email'] as string,
      passwordHash: row['password_hash'] as string,
      role: row['role'] as AuthorRole,
      bio: row['bio'] as string | undefined,
      avatarUrl: row['avatar_url'] as string | undefined,
      isActive: row['is_active'] as boolean,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    });
  }

  async findById(id: string): Promise<Author | null> {
    const result = await this.pool.query('SELECT * FROM authors WHERE id = $1', [id]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByEmail(email: string): Promise<Author | null> {
    const result = await this.pool.query(
      'SELECT * FROM authors WHERE email = $1',
      [email.toLowerCase()]
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findAll(page: number, limit: number): Promise<{ data: Author[]; total: number }> {
    const offset = (page - 1) * limit;
    const [countRes, dataRes] = await Promise.all([
      this.pool.query('SELECT COUNT(*) FROM authors'),
      this.pool.query('SELECT * FROM authors ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]),
    ]);
    return {
      data: dataRes.rows.map(r => this.mapRow(r)),
      total: parseInt(countRes.rows[0].count as string, 10),
    };
  }

  async save(author: Author): Promise<void> {
    const p = author.toPrimitives();
    await this.pool.query(
      `INSERT INTO authors (id, name, email, password_hash, role, bio, avatar_url, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [p.id, p.name, p.email, p.passwordHash, p.role, p.bio, p.avatarUrl, p.isActive, p.createdAt, p.updatedAt]
    );
  }

  async update(author: Author): Promise<void> {
    const p = author.toPrimitives();
    await this.pool.query(
      `UPDATE authors SET name=$2, password_hash=$3, role=$4, bio=$5, avatar_url=$6, is_active=$7, updated_at=$8
       WHERE id=$1`,
      [p.id, p.name, p.passwordHash, p.role, p.bio, p.avatarUrl, p.isActive, p.updatedAt]
    );
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM authors WHERE id = $1', [id]);
  }

  async existsByEmail(email: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT 1 FROM authors WHERE email = $1',
      [email.toLowerCase()]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }
}
