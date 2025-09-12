import { injectable } from 'tsyringe';
import mongoose, { Schema, Document, Model } from 'mongoose';
import { Category } from '../../../domain/entities/Category';
import { ICategoryRepository } from '../../../domain/repositories/ICategoryRepository';

interface CategoryDocument extends Document<string> { _id: string; name: string; slug: string; description?: string; parentId?: string; createdAt: Date; updatedAt: Date; }
const schema = new Schema<CategoryDocument>(
  { _id: String, name: String, slug: { type: String, unique: true }, description: String, parentId: String },
  { timestamps: true, _id: false }
);
let CategoryModel: Model<CategoryDocument>;
function getModel(): Model<CategoryDocument> {
  if (!CategoryModel) CategoryModel = mongoose.model<CategoryDocument>('Category', schema);
  return CategoryModel;
}

@injectable()
export class MongoCategoryRepository implements ICategoryRepository {
  private mapDoc(d: CategoryDocument): Category {
    return Category.reconstitute({ id: d._id, name: d.name, slug: d.slug, description: d.description, parentId: d.parentId, createdAt: d.createdAt, updatedAt: d.updatedAt });
  }
  async findById(id: string): Promise<Category | null> { const d = await getModel().findById(id).lean<CategoryDocument>(); return d ? this.mapDoc(d) : null; }
  async findBySlug(slug: string): Promise<Category | null> { const d = await getModel().findOne({ slug }).lean<CategoryDocument>(); return d ? this.mapDoc(d) : null; }
  async findAll(): Promise<Category[]> { return (await getModel().find().lean<CategoryDocument[]>()).map(d => this.mapDoc(d)); }
  async findChildren(parentId: string): Promise<Category[]> { return (await getModel().find({ parentId }).lean<CategoryDocument[]>()).map(d => this.mapDoc(d)); }
  async save(c: Category): Promise<void> { await getModel().create({ _id: c.id, ...c.toPrimitives() }); }
  async update(c: Category): Promise<void> { await getModel().findByIdAndUpdate(c.id, { $set: c.toPrimitives() }); }
  async delete(id: string): Promise<void> { await getModel().findByIdAndDelete(id); }
  async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
    const q: Record<string, unknown> = { slug };
    if (excludeId) q['_id'] = { $ne: excludeId };
    return (await getModel().countDocuments(q)) > 0;
  }
}
