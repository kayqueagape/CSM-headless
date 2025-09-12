import { injectable } from 'tsyringe';
import { Pool } from 'pg';
import { Category } from '../../../domain/entities/Category';
import { ICategoryRepository } from '../../../domain/repositories/ICategoryRepository';
import { env } from '../../config/env';

@injectable()
export class PgCategoryRepository implements ICategoryRepository {
  private readonly pool = new Pool({ connectionString: env.DATABASE_URL });
  private mapRow(r: Record<string, unknown>): Category {
    return Category.reconstitute({ id: r['id'] as string, name: r['name'] as string, slug: r['slug'] as string, description: r['description'] as string, parentId: r['parent_id'] as string, createdAt: new Date(r['created_at'] as string), updatedAt: new Date(r['updated_at'] as string) });
  }
  async findById(id: string): Promise<Category | null> { const r = await this.pool.query('SELECT * FROM categories WHERE id=$1',[id]); return r.rows[0] ? this.mapRow(r.rows[0]) : null; }
  async findBySlug(slug: string): Promise<Category | null> { const r = await this.pool.query('SELECT * FROM categories WHERE slug=$1',[slug]); return r.rows[0] ? this.mapRow(r.rows[0]) : null; }
  async findAll(): Promise<Category[]> { const r = await this.pool.query('SELECT * FROM categories ORDER BY name'); return r.rows.map(row => this.mapRow(row)); }
  async findChildren(parentId: string): Promise<Category[]> { const r = await this.pool.query('SELECT * FROM categories WHERE parent_id=$1',[parentId]); return r.rows.map(row => this.mapRow(row)); }
  async save(c: Category): Promise<void> { const p=c.toPrimitives(); await this.pool.query('INSERT INTO categories (id,name,slug,description,parent_id,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7)',[p.id,p.name,p.slug,p.description,p.parentId,p.createdAt,p.updatedAt]); }
  async update(c: Category): Promise<void> { const p=c.toPrimitives(); await this.pool.query('UPDATE categories SET name=$2,description=$3,updated_at=$4 WHERE id=$1',[p.id,p.name,p.description,p.updatedAt]); }
  async delete(id: string): Promise<void> { await this.pool.query('DELETE FROM categories WHERE id=$1',[id]); }
  async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
    const q = excludeId ? 'SELECT 1 FROM categories WHERE slug=$1 AND id!=$2' : 'SELECT 1 FROM categories WHERE slug=$1';
    const r = await this.pool.query(q, excludeId ? [slug,excludeId] : [slug]);
    return r.rowCount !== null && r.rowCount > 0;
  }
}
