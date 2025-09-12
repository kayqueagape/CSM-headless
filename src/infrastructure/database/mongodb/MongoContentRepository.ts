import { injectable } from 'tsyringe';
import mongoose, { Schema, Document, Model } from 'mongoose';
import { Content } from '../../../domain/entities/Content';
import { ContentStatus } from '../../../domain/value-objects/ContentStatus';
import {
  IContentRepository,
  ContentFilters,
  PaginationOptions,
  PaginatedResult,
} from '../../../domain/repositories/IContentRepository';
import { env } from '../../config/env';

// ─── Mongoose Schema ──────────────────────────────────────────────────────────

interface ContentDocument extends Document<string> {
  _id: string;
  title: string;
  slug: string;
  body: string;
  excerpt?: string;
  status: ContentStatus;
  authorId: string;
  categoryId?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const contentSchema = new Schema<ContentDocument>(
  {
    _id: { type: String, required: true },
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    body: { type: String, required: true },
    excerpt: { type: String },
    status: { type: String, enum: Object.values(ContentStatus), default: ContentStatus.DRAFT },
    authorId: { type: String, required: true, index: true },
    categoryId: { type: String, index: true },
    tags: { type: [String], default: [] },
    metadata: { type: Schema.Types.Mixed, default: {} },
    publishedAt: { type: Date },
  },
  {
    timestamps: true,
    _id: false, // We manage IDs ourselves (UUID)
  }
);

contentSchema.index({ slug: 1 });
contentSchema.index({ status: 1 });
contentSchema.index({ tags: 1 });
contentSchema.index({ title: 'text', body: 'text' });

let ContentModel: Model<ContentDocument>;

function getContentModel(): Model<ContentDocument> {
  if (!ContentModel) {
    ContentModel = mongoose.model<ContentDocument>('Content', contentSchema);
  }
  return ContentModel;
}

/**
 * MongoContentRepository — Adapter MongoDB.
 * Mesma interface, implementação diferente.
 * Troca de postgres para mongo: apenas muda o DB_DRIVER no .env
 */
@injectable()
export class MongoContentRepository implements IContentRepository {
  constructor() {
    if (mongoose.connection.readyState === 0) {
      mongoose.connect(env.MONGODB_URI ?? 'mongodb://localhost:27017/cms-headless');
    }
  }

  private mapDoc(doc: ContentDocument): Content {
    return Content.reconstitute({
      id: doc._id,
      title: doc.title,
      slug: doc.slug,
      body: doc.body,
      excerpt: doc.excerpt,
      status: doc.status,
      authorId: doc.authorId,
      categoryId: doc.categoryId,
      tags: doc.tags,
      metadata: doc.metadata,
      publishedAt: doc.publishedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  async findById(id: string): Promise<Content | null> {
    const doc = await getContentModel().findById(id).lean<ContentDocument>();
    return doc ? this.mapDoc(doc) : null;
  }

  async findBySlug(slug: string): Promise<Content | null> {
    const doc = await getContentModel().findOne({ slug }).lean<ContentDocument>();
    return doc ? this.mapDoc(doc) : null;
  }

  async findAll(
    filters: ContentFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Content>> {
    const query: Record<string, unknown> = {};

    if (filters.status) query['status'] = filters.status;
    if (filters.authorId) query['authorId'] = filters.authorId;
    if (filters.categoryId) query['categoryId'] = filters.categoryId;
    if (filters.tags?.length) query['tags'] = { $all: filters.tags };
    if (filters.search) query['$text'] = { $search: filters.search };

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [total, docs] = await Promise.all([
      getContentModel().countDocuments(query),
      getContentModel()
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<ContentDocument[]>(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: docs.map(doc => this.mapDoc(doc)),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async save(content: Content): Promise<void> {
    const p = content.toPrimitives();
    await getContentModel().create({
      _id: p.id,
      ...p,
    });
  }

  async update(content: Content): Promise<void> {
    const p = content.toPrimitives();
    await getContentModel().findByIdAndUpdate(p.id, { $set: p });
  }

  async delete(id: string): Promise<void> {
    await getContentModel().findByIdAndDelete(id);
  }

  async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
    const query: Record<string, unknown> = { slug };
    if (excludeId) query['_id'] = { $ne: excludeId };
    const count = await getContentModel().countDocuments(query);
    return count > 0;
  }

  async countByAuthor(authorId: string): Promise<number> {
    return getContentModel().countDocuments({ authorId });
  }
}
