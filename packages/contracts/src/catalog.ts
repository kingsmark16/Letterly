import { z } from "zod";

export const categoryCatalogItemSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  displayOrder: z.number().int().nonnegative(),
});

export const templateVersionCatalogItemSchema = z.object({
  id: z.string().uuid(),
  version: z.number().int().positive(),
  capabilities: z.array(z.string().min(1)),
});

export const templateCatalogItemSchema = z.object({
  id: z.string().uuid(),
  categoryKey: z.string().min(1),
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  displayOrder: z.number().int().nonnegative(),
  versions: z.array(templateVersionCatalogItemSchema),
});

export const categoryCatalogResponseSchema = z.array(categoryCatalogItemSchema);

export const templateCatalogResponseSchema = z.array(templateCatalogItemSchema);

export type CategoryCatalogItem = z.infer<typeof categoryCatalogItemSchema>;

export type TemplateCatalogItem = z.infer<typeof templateCatalogItemSchema>;
