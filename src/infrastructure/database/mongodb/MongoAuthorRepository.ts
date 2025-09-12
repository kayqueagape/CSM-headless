import { injectable } from 'tsyringe';
import mongoose, { Schema, Document, Model } from 'mongoose';
import { Author, AuthorRole } from '../../../domain/entities/Author';
import { IAuthorRepository } from '../../../domain/repositories/IAuthorRepository';

interface AuthorDocument extends Document<string> {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: AuthorRole;
  bio?: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const authorSchema = new Schema<AuthorDocument>(
  { _id: String, name: String, email: { type: String, unique: true },
    passwordHash: String, role: String, bio: String, avatarUrl: String, isActive: { type: Boolean, default: true } },
  { timestamps: true, _id: false }
);

let AuthorModel: Model<AuthorDocument>;
function getModel(): Model<AuthorDocument> {
  if (!AuthorModel) AuthorModel = mongoose.model<AuthorDocument>('Author', authorSchema);
  return AuthorModel;
}

@injectable()
export class MongoAuthorRepository implements IAuthorRepository {
  private mapDoc(doc: AuthorDocument): Author {
    return Author.reconstitute({
      id: doc._id, name: doc.name, email: doc.email, passwordHash: doc.passwordHash,
      role: doc.role, bio: doc.bio, avatarUrl: doc.avatarUrl, isActive: doc.isActive,
      createdAt: doc.createdAt, updatedAt: doc.updatedAt,
    });
  }

  async findById(id: string): Promise<Author | null> {
    const doc = await getModel().findById(id).lean<AuthorDocument>();
    return doc ? this.mapDoc(doc) : null;
  }
  async findByEmail(email: string): Promise<Author | null> {
    const doc = await getModel().findOne({ email: email.toLowerCase() }).lean<AuthorDocument>();
    return doc ? this.mapDoc(doc) : null;
  }
  async findAll(page: number, limit: number): Promise<{ data: Author[]; total: number }> {
    const [total, docs] = await Promise.all([
      getModel().countDocuments(),
      getModel().find().skip((page-1)*limit).limit(limit).lean<AuthorDocument[]>(),
    ]);
    return { data: docs.map(d => this.mapDoc(d)), total };
  }
  async save(author: Author): Promise<void> {
    const p = author.toPrimitives();
    await getModel().create({ _id: p.id, ...p });
  }
  async update(author: Author): Promise<void> {
    const p = author.toPrimitives();
    await getModel().findByIdAndUpdate(p.id, { $set: p });
  }
  async delete(id: string): Promise<void> {
    await getModel().findByIdAndDelete(id);
  }
  async existsByEmail(email: string): Promise<boolean> {
    return (await getModel().countDocuments({ email: email.toLowerCase() })) > 0;
  }
}
