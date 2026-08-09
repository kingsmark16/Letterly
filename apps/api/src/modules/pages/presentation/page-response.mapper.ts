import {
  ownerPageProjectionSchema,
  type OwnerPageProjection,
} from '@letterly/contracts/pages';
import type { OwnerPage } from '../domain/page.types';

export function toOwnerPageProjection(page: OwnerPage): OwnerPageProjection {
  return ownerPageProjectionSchema.parse({
    id: page.id,
    slug: page.slug,
    recipientLabel: page.content.recipientName.trim() || 'Untitled letter',
    status: page.status,
    contentVersion: page.contentVersion,
    content: page.content,
    settings: page.settings,
    template: page.template,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  });
}
