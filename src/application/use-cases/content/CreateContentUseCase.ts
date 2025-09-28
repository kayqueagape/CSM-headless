import { injectable, inject } from "tsyringe";
import { Content } from "../../../domain/entities/Content";
import { ContentSlug } from "../../../domain/value-objects/ContentSlug";
import { IContentRepository } from "../../../domain/repositories/IContentRepository";
import { IAuthorRepository } from "../../../domain/repositories/IAuthorRepository";
import { ConflictError, NotFoundError } from "../../../domain/errors/DomainError";
import { CreateContentInput, ContentDTO } from "../../dtos/ContentDTO";
import { TOKENS } from "../../../infrastructure/tokens";
import { ContentMapper } from "../../mappers/ContentMapper";

export interface CreateContentCommand {
  input: CreateContentInput;
  requesterId: string;
}

@injectable()
export class CreateContentUseCase {
  constructor(
    @inject(TOKENS.ContentRepository)
    private readonly contentRepo: IContentRepository,

    @inject(TOKENS.AuthorRepository)
    private readonly authorRepo: IAuthorRepository,
  ) {}

  async execute({ input, requesterId }: CreateContentCommand): Promise<ContentDTO> {
    const author = await this.authorRepo.findById(requesterId);
    if (!author) {
      throw new NotFoundError("Author", requesterId);
    }
    if (!author.isActive) {
      throw new NotFoundError("Author", requesterId);
    }

    const slug = input.slug
      ? ContentSlug.create(input.slug).value
      : ContentSlug.fromTitle(input.title).value;

    const slugExists = await this.contentRepo.existsBySlug(slug);
    if (slugExists) {
      throw new ConflictError(`Slug "${slug}" is already in use`);
    }

    const content = Content.create({
      title: input.title,
      slug,
      body: input.body,
      excerpt: input.excerpt,
      authorId: requesterId,
      categoryId: input.categoryId,
      tags: input.tags,
      metadata: input.metadata,
    });

    await this.contentRepo.save(content);

    return ContentMapper.toDTO(content);
  }
}
