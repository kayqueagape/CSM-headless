export const TOKENS = {
  ContentRepository: Symbol("ContentRepository"),
  AuthorRepository: Symbol("AuthorRepository"),
  CategoryRepository: Symbol("CategoryRepository"),
  HashService: Symbol("HashService"),
  TokenService: Symbol("TokenService"),
  Logger: Symbol("Logger"),
  DatabaseConfig: Symbol("DatabaseConfig"),
} as const;

export type TokenKey = keyof typeof TOKENS;
