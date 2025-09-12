import { DomainError } from "../errors/DomainError";

export class Email {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(raw: string): Email {
    const normalized = raw.toLowerCase().trim();
    const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!EMAIL_REGEX.test(normalized)) {
      throw new DomainError(`Invalid email address: "${raw}"`);
    }

    return new Email(normalized);
  }

  equals(other: Email): boolean {
    return this._value === other._value;
  }

  get value(): string {
    return this._value;
  }

  get domain(): string {
    return this._value.split("@")[1];
  }

  toString(): string {
    return this._value;
  }
}
