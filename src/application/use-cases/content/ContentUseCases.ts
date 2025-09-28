import { injectable, inject } from "tsyringe";
import { IContentRepository, ContentFilters } from "../../../domain/repositories/IContentRepository";
import { IAuthorRepository } from "../../../domain/repositories/IAuthorRepository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors/DomainError";
import { UpdateContentInput, ContentDTO, PaginatedContentDTO, ListContentInput } from "../../dtos/ContentDTO";
import { TOKENS } from "../../../infrastructure/tokens";
import { ContentMapper } from "../../mappers/ContentMapper";
import { ContentStatus } from "../../../domain/value-objects/ContentStatus";
import { AuthorRole } from "../../../domain/entities/Author";

@injectable()
export class GetContentByIdUseCase {
  constructor(
    @inject(TOKENS.ContentRepository)
    private readonly contentRepo: IContentRepository,
  ) {}

  async execute(id: string): Promise<ContentDTO> {
    const content = await this.contentRepo.findById(id);
    if (!content) throw new NotFoundError("Content", id);
    return ContentMapper.toDTO(content);
  }
}


@injectable()
export class GetContentBySlugUseCase {
  constructor(
    @inject(TOKENS.ContentRepository)
    private readonly contentRepo: IContentRepository,
  ) {}

  async execute(slug: string): Promise<ContentDTO> {
    const content = await this.contentRepo.findBySlug(slug);
    if (!content) throw new NotFoundError("Content");
    return ContentMapper.toDTO(content);
  }
}

@injectable()
export class ListContentsUseCase {
  constructor(
    @inject(TOKENS.ContentRepository)
    private readonly contentRepo: IContentRepository,
  ) {}

  async execute(input: ListContentInput): Promise<PaginatedContentDTO> {
    const filters: ContentFilters = {
      status: input.status as ContentStatus | undefined,
      authorId: input.authorId,
      categoryId: input.categoryId,
      tags: input.tags ? input.tags.split(",").map(t => t.trim()) : undefined,
      search: input.search,
    };

    const result = await this.contentRepo.findAll(filters, {
      page: input.page,
      limit: input.limit,
    });

    return {
      data: result.data.map(ContentMapper.toDTO),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev,
      },
    };
  }
}

export interface UpdateContentCommand {
  contentId: string;
  input: UpdateContentInput;
  requesterId: string;
}

@injectable()
export class UpdateContentUseCase {
  constructor(
    @inject(TOKENS.ContentRepository)
    private readonly contentRepo: IContentRepository,

    @inject(TOKENS.AuthorRepository)
    private readonly authorRepo: IAuthorRepository,
  ) {}

  async execute({ contentId, input, requesterId }: UpdateContentCommand): Promise<ContentDTO> {
    const [content, requester] = await Promise.all([
      this.contentRepo.findById(contentId),
      this.authorRepo.findById(requesterId),
    ]);

    if (!content) throw new NotFoundError("Content", contentId);
    if (!requester) throw new NotFoundError("Author", requesterId);

    if (!requester.canManageContent(content.authorId)) {
      throw new ForbiddenError("You do not have permission to update this content");
    }

    content.update({
      title: input.title,
      body: input.body,
      excerpt: input.excerpt ?? undefined,
      categoryId: input.categoryId ?? undefined,
      tags: input.tags,
      metadata: input.metadata,
    });

    await this.contentRepo.update(content);
    return ContentMapper.toDTO(content);
  }
}

export interface PublishContentCommand {
  contentId: string;
  requesterId: string;
}

@injectable()
export class PublishContentUseCase {
  constructor(
    @inject(TOKENS.ContentRepository)
    private readonly contentRepo: IContentRepository,

    @inject(TOKENS.AuthorRepository)
    private readonly authorRepo: IAuthorRepository,
  ) {}

  async execute({ contentId, requesterId }: PublishContentCommand): Promise<ContentDTO> {
    const [content, requester] = await Promise.all([
      this.contentRepo.findById(contentId),
      this.authorRepo.findById(requesterId),
    ]);

    if (!content) throw new NotFoundError("Content", contentId);
    if (!requester) throw new NotFoundError("Author", requesterId);

    if (!requester.hasRole(AuthorRole.ADMIN, AuthorRole.EDITOR)) {
      if (!content.isOwnedBy(requesterId)) {
        throw new ForbiddenError("You can only publish your own content");
      }
    }

    content.publish();

    await this.contentRepo.update(content);
    return ContentMapper.toDTO(content);
  }
}

@injectable()
export class DeleteContentUseCase {
  constructor(
    @inject(TOKENS.ContentRepository)
    private readonly contentRepo: IContentRepository,

    @inject(TOKENS.AuthorRepository)
    private readonly authorRepo: IAuthorRepository,
  ) {}

  async execute(contentId: string, requesterId: string): Promise<void> {
    const [content, requester] = await Promise.all([
      this.contentRepo.findById(contentId),
      this.authorRepo.findById(requesterId),
    ]);

    if (!content) throw new NotFoundError("Content", contentId);
    if (!requester) throw new NotFoundError("Author", requesterId);

    if (!requester.canManageContent(content.authorId)) {
      throw new ForbiddenError("You do not have permission to delete this content");
    }

    if (content.isPublished() && !requester.hasRole(AuthorRole.ADMIN)) {
      throw new ForbiddenError("Only admins can delete published content");
    }

    await this.contentRepo.delete(contentId);
  }
}
