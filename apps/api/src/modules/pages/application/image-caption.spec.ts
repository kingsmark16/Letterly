import {
  IMAGE_CAPTION_MAX_GRAPHEMES,
  imageCaptionProjectionSchema,
  imageCaptionSchema,
} from '@letterly/templates/media';

describe('image caption limits', () => {
  it('AC-5 accepts a caption at the 150 grapheme boundary', () => {
    const caption = 'a'.repeat(IMAGE_CAPTION_MAX_GRAPHEMES);

    expect(imageCaptionSchema.parse(caption)).toBe(caption);
  });

  it('AC-5 rejects a caption after the 150 grapheme boundary', () => {
    const caption = 'a'.repeat(IMAGE_CAPTION_MAX_GRAPHEMES + 1);

    expect(() => imageCaptionSchema.parse(caption)).toThrow(
      'caption must contain at most 150 graphemes',
    );
  });

  it('AC-5 counts composed Unicode characters as one grapheme', () => {
    const caption = 'e\u0301'.repeat(IMAGE_CAPTION_MAX_GRAPHEMES);

    expect(imageCaptionSchema.parse(caption)).toBe(caption);
  });

  it('AC-5 keeps existing longer captions readable during migration', () => {
    const legacyCaption = 'a'.repeat(IMAGE_CAPTION_MAX_GRAPHEMES + 1);

    expect(imageCaptionProjectionSchema.parse(legacyCaption)).toBe(
      legacyCaption,
    );
  });
});
