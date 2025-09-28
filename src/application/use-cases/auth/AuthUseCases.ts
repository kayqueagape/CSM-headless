import { injectable, inject } from "tsyringe";
import { z } from "zod";
import { Author } from "../../../domain/entities/Author";
import { IAuthorRepository } from "../../../domain/repositories/IAuthorRepository";
import { ConflictError, UnauthorizedError } from "../../../domain/errors/DomainError";
import { IHashService, ITokenService } from "../../ports/services";
import { TOKENS } from "../../../infrastructure/tokens";

export const RegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  bio: z.string().max(500).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

export interface AuthResponse {
  token: string;
  author: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

@injectable()
export class RegisterUseCase {
  constructor(
    @inject(TOKENS.AuthorRepository)
    private readonly authorRepo: IAuthorRepository,

    @inject(TOKENS.HashService)
    private readonly hashService: IHashService,

    @inject(TOKENS.TokenService)
    private readonly tokenService: ITokenService,
  ) {}

  async execute(input: RegisterInput): Promise<AuthResponse> {
    const emailExists = await this.authorRepo.existsByEmail(input.email);
    if (emailExists) {
      throw new ConflictError("Email already in use");
    }

    const passwordHash = await this.hashService.hash(input.password);

    const author = Author.create({
      name: input.name,
      email: input.email,
      passwordHash,
      bio: input.bio,
    });

    await this.authorRepo.save(author);

    const token = this.tokenService.sign({
      sub: author.id,
      email: author.email,
      role: author.role,
    });

    return {
      token,
      author: {
        id: author.id,
        name: author.name,
        email: author.email,
        role: author.role,
      },
    };
  }
}

@injectable()
export class LoginUseCase {
  constructor(
    @inject(TOKENS.AuthorRepository)
    private readonly authorRepo: IAuthorRepository,

    @inject(TOKENS.HashService)
    private readonly hashService: IHashService,

    @inject(TOKENS.TokenService)
    private readonly tokenService: ITokenService,
  ) {}

  async execute(input: LoginInput): Promise<AuthResponse> {
    const author = await this.authorRepo.findByEmail(input.email);

    // Mensagem genérica para evitar enumeração de usuários
    const INVALID_CREDENTIALS = "Invalid email or password";

    if (!author) {
      throw new UnauthorizedError(INVALID_CREDENTIALS);
    }

    if (!author.isActive) {
      throw new UnauthorizedError("Account is deactivated");
    }

    const passwordMatch = await this.hashService.compare(
      input.password,
      author.passwordHash
    );

    if (!passwordMatch) {
      throw new UnauthorizedError(INVALID_CREDENTIALS);
    }

    const token = this.tokenService.sign({
      sub: author.id,
      email: author.email,
      role: author.role,
    });

    return {
      token,
      author: {
        id: author.id,
        name: author.name,
        email: author.email,
        role: author.role,
      },
    };
  }
}
