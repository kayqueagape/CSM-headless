import { DomainError } from "../errors/DomainError";

export class ContentSlug {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(raw: string): ContentSlug {
    const normalized = ContentSlug.normalize(raw);

    if (!normalized || normalized.length < 2) {
      throw new DomainError(`Invalid slug: "${raw}". Must have at least 2 characters`);
    }

    if (normalized.length > 200) {
      throw new DomainError("Slug must not exceed 200 characters");
    }

    const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!SLUG_REGEX.test(normalized)) {
      throw new DomainError(`Invalid slug format: "${normalized}"`);
    }

    return new ContentSlug(normalized);
  }

  static fromTitle(title: string): ContentSlug {
    const normalized = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    return ContentSlug.create(normalized);
  }

  private static normalize(raw: string): string {
    return raw.toLowerCase().trim();
  }

  equals(other: ContentSlug): boolean {
    return this._value === other._value;
  }

  get value(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }
}
