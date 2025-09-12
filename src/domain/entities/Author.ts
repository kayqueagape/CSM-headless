import { randomUUID } from "crypto";
import { DomainError } from "../errors/DomainError";
import { Email } from "../value-objects/Email";

export enum AuthorRole {
  ADMIN = "ADMIN",
  EDITOR = "EDITOR",
  AUTHOR = "AUTHOR",
  VIEWER = "VIEWER",
}

export interface AuthorProps {
  id?: string;
  name: string;
  email: string;
  passwordHash: string;
  role: AuthorRole;
  bio?: string | null;
  avatarUrl?: string | null;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthorPrimitives {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: AuthorRole;
  bio: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Author {
  private readonly _id: string;
  private _name: string;
  private readonly _email: Email;
  private _passwordHash: string;
  private _role: AuthorRole;
  private _bio: string | null;
  private _avatarUrl: string | null;
  private _isActive: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: AuthorProps) {
    this._id = props.id ?? randomUUID();
    this._name = props.name;
    this._email = Email.create(props.email);
    this._passwordHash = props.passwordHash;
    this._role = props.role;
    this._bio = props.bio ?? null;
    this._avatarUrl = props.avatarUrl ?? null;
    this._isActive = props.isActive ?? true;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  static create(props: Omit<AuthorProps, "id" | "role">): Author {
    Author.validateName(props.name);
    return new Author({ ...props, role: AuthorRole.AUTHOR });
  }

  static reconstitute(props: AuthorProps): Author {
    return new Author(props);
  }

  promote(toRole: AuthorRole, promotedBy: Author): void {
    if (promotedBy._role !== AuthorRole.ADMIN) {
      throw new DomainError("Only admins can promote users");
    }
    if (toRole === AuthorRole.ADMIN && this._role === AuthorRole.ADMIN) {
      throw new DomainError("User is already an admin");
    }
    this._role = toRole;
    this.touch();
  }

  deactivate(): void {
    if (!this._isActive) {
      throw new DomainError("Author is already inactive");
    }
    this._isActive = false;
    this.touch();
  }

  updateProfile(props: Partial<Pick<AuthorProps, "name" | "bio" | "avatarUrl">>): void {
    if (!this._isActive) {
      throw new DomainError("Inactive author cannot update profile");
    }
    if (props.name) {
      Author.validateName(props.name);
      this._name = props.name;
    }
    if (props.bio !== undefined) this._bio = props.bio ?? null;
    if (props.avatarUrl !== undefined) this._avatarUrl = props.avatarUrl ?? null;
    this.touch();
  }

  changePassword(newHash: string): void {
    this._passwordHash = newHash;
    this.touch();
  }

  canManageContent(contentAuthorId: string): boolean {
    return (
      this._role === AuthorRole.ADMIN ||
      this._role === AuthorRole.EDITOR ||
      contentAuthorId === this._id
    );
  }

  hasRole(...roles: AuthorRole[]): boolean {
    return roles.includes(this._role);
  }

  private touch(): void {
    this._updatedAt = new Date();
  }

  private static validateName(name: string): void {
    if (!name || name.trim().length < 2) {
      throw new DomainError("Name must have at least 2 characters");
    }
  }

  get id(): string { return this._id; }
  get name(): string { return this._name; }
  get email(): string { return this._email.value; }
  get passwordHash(): string { return this._passwordHash; }
  get role(): AuthorRole { return this._role; }
  get bio(): string | null { return this._bio; }
  get avatarUrl(): string | null { return this._avatarUrl; }
  get isActive(): boolean { return this._isActive; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  toPrimitives(): AuthorPrimitives {
    return {
      id: this._id,
      name: this._name,
      email: this._email.value,
      passwordHash: this._passwordHash,
      role: this._role,
      bio: this._bio,
      avatarUrl: this._avatarUrl,
      isActive: this._isActive,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
