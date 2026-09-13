import { hasAtMostGraphemes } from "@letterly/templates/graphemes";
import { z } from "zod";

export const IMAGE_CAPTION_MAX_GRAPHEMES = 150;

export const imageCaptionSchema = z
  .string()
  .trim()
  .refine((value) => hasAtMostGraphemes(value, IMAGE_CAPTION_MAX_GRAPHEMES), {
    error: `caption must contain at most ${IMAGE_CAPTION_MAX_GRAPHEMES} graphemes`,
  });

/**
 * Read projections remain compatible with captions created before the current
 * editor limit. New and edited captions are validated with imageCaptionSchema.
 */
export const imageCaptionProjectionSchema = z.string();
