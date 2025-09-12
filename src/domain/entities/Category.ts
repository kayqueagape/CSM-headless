import { randomUUID } from "crypto";
import { ContentSlug } from "../value-objects/ContentSlug";
import { DomainError } from "../errors/DomainError";

export interface CategoryProps {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CategoryPrimitives {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Category {
  private readonly _id: string;
  private _name: string;
  private _slug: ContentSlug;
  private _description: string | null;
  private _parentId: string | null;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: CategoryProps) {
    this._id = props.id ?? randomUUID();
    this._name = props.name;
    this._slug = ContentSlug.create(props.slug);
    this._description = props.description ?? null;
    this._parentId = props.parentId ?? null;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  static create(props: Omit<CategoryProps, "id">): Category {
    if (!props.name || props.name.trim().length < 2) {
      throw new DomainError("Category name must have at least 2 characters");
    }
    return new Category(props);
  }

  static reconstitute(props: CategoryProps): Category {
    return new Category(props);
  }

  update(props: Partial<Pick<CategoryProps, "name" | "description">>): void {
    if (props.name) this._name = props.name;
    if (props.description !== undefined) this._description = props.description ?? null;
    this._updatedAt = new Date();
  }

  get id(): string { return this._id; }
  get name(): string { return this._name; }
  get slug(): string { return this._slug.value; }
  get description(): string | null { return this._description; }
  get parentId(): string | null { return this._parentId; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  toPrimitives(): CategoryPrimitives {
    return {
      id: this._id,
      name: this._name,
      slug: this._slug.value,
      description: this._description,
      parentId: this._parentId,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
