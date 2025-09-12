import { randomUUID } from "crypto";
import { ContentStatus } from "../value-objects/ContentStatus";
import { ContentSlug } from "../value-objects/ContentSlug";
import { DomainError } from "../errors/DomainError";

export interface ContentProps {
  id?: string;
  title: string;
  slug: string;
  body: string;
  excerpt?: string | null;
  status: ContentStatus;
  authorId: string;
  categoryId?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
  publishedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ContentPrimitives {
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
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Content {
  private readonly _id: string;
  private _title: string;
  private _slug: ContentSlug;
  private _body: string;
  private _excerpt: string | null;
  private _status: ContentStatus;
  private readonly _authorId: string;
  private _categoryId: string | null;
  private _tags: string[];
  private _metadata: Record<string, unknown>;
  private _publishedAt: Date | null;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: ContentProps) {
    this._id = props.id ?? randomUUID();
    this._title = props.title;
    this._slug = ContentSlug.create(props.slug);
    this._body = props.body;
    this._excerpt = props.excerpt ?? null;
    this._status = props.status;
    this._authorId = props.authorId;
    this._categoryId = props.categoryId ?? null;
    this._tags = props.tags ?? [];
    this._metadata = props.metadata ?? {};
    this._publishedAt = props.publishedAt ?? null;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }


  static create(props: Omit<ContentProps, "status" | "id">): Content {
    Content.validateTitle(props.title);
    Content.validateBody(props.body);

    return new Content({
      ...props,
      status: ContentStatus.DRAFT,
    });
  }

  static reconstitute(props: ContentProps): Content {
    return new Content(props);
  }


  publish(): void {
    if (this._status === ContentStatus.PUBLISHED) {
      throw new DomainError("Content is already published");
    }
    if (!this._body || this._body.trim().length < 10) {
      throw new DomainError("Content body is too short to be published");
    }

    this._status = ContentStatus.PUBLISHED;
    this._publishedAt = new Date();
    this.touch();
  }

  unpublish(): void {
    if (this._status !== ContentStatus.PUBLISHED) {
      throw new DomainError("Only published content can be unpublished");
    }

    this._status = ContentStatus.DRAFT;
    this._publishedAt = null;
    this.touch();
  }

  archive(): void {
    if (this._status === ContentStatus.ARCHIVED) {
      throw new DomainError("Content is already archived");
    }

    this._status = ContentStatus.ARCHIVED;
    this.touch();
  }

  update(props: Partial<Pick<ContentProps, "title" | "body" | "excerpt" | "categoryId" | "tags" | "metadata">>): void {
    if (this._status === ContentStatus.ARCHIVED) {
      throw new DomainError("Archived content cannot be updated");
    }

    if (props.title !== undefined) {
      Content.validateTitle(props.title);
      this._title = props.title;
    }

    if (props.body !== undefined) {
      Content.validateBody(props.body);
      this._body = props.body;
    }

    if (props.excerpt !== undefined) this._excerpt = props.excerpt;
    if (props.categoryId !== undefined) this._categoryId = props.categoryId;
    if (props.tags !== undefined) this._tags = [...props.tags];
    if (props.metadata !== undefined) this._metadata = { ...props.metadata };

    this.touch();
  }

  changeSlug(newSlug: string): void {
    if (this._status === ContentStatus.PUBLISHED) {
      throw new DomainError("Cannot change slug of published content — it would break existing URLs");
    }

    this._slug = ContentSlug.create(newSlug);
    this.touch();
  }

  addTag(tag: string): void {
    const normalized = tag.toLowerCase().trim();
    if (!this._tags.includes(normalized)) {
      this._tags = [...this._tags, normalized];
      this.touch();
    }
  }

  removeTag(tag: string): void {
    const normalized = tag.toLowerCase().trim();
    this._tags = this._tags.filter(t => t !== normalized);
    this.touch();
  }

  isPublished(): boolean {
    return this._status === ContentStatus.PUBLISHED;
  }

  isOwnedBy(authorId: string): boolean {
    return this._authorId === authorId;
  }

  private touch(): void {
    this._updatedAt = new Date();
  }

  private static validateTitle(title: string): void {
    if (!title || title.trim().length < 3) {
      throw new DomainError("Title must have at least 3 characters");
    }
    if (title.length > 255) {
      throw new DomainError("Title must not exceed 255 characters");
    }
  }

  private static validateBody(body: string): void {
    if (!body || body.trim().length === 0) {
      throw new DomainError("Body cannot be empty");
    }
  }

  get id(): string { return this._id; }
  get title(): string { return this._title; }
  get slug(): string { return this._slug.value; }
  get body(): string { return this._body; }
  get excerpt(): string | null { return this._excerpt; }
  get status(): ContentStatus { return this._status; }
  get authorId(): string { return this._authorId; }
  get categoryId(): string | null { return this._categoryId; }
  get tags(): string[] { return [...this._tags]; }
  get metadata(): Record<string, unknown> { return { ...this._metadata }; }
  get publishedAt(): Date | null { return this._publishedAt; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  toPrimitives(): ContentPrimitives {
    return {
      id: this._id,
      title: this._title,
      slug: this._slug.value,
      body: this._body,
      excerpt: this._excerpt,
      status: this._status,
      authorId: this._authorId,
      categoryId: this._categoryId,
      tags: [...this._tags],
      metadata: { ...this._metadata },
      publishedAt: this._publishedAt,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
