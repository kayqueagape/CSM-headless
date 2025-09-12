export enum ContentStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
}

export const VALID_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  [ContentStatus.DRAFT]: [ContentStatus.PUBLISHED, ContentStatus.ARCHIVED],
  [ContentStatus.PUBLISHED]: [ContentStatus.DRAFT, ContentStatus.ARCHIVED],
  [ContentStatus.ARCHIVED]: [],
};

export function isValidTransition(from: ContentStatus, to: ContentStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}
