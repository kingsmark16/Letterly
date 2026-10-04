import Image from "next/image";
import styles from "./memory-gallery.module.css";

export type MemoryGalleryItem = {
  id: string;
  src: string;
  caption: string;
};

type MemoryGalleryProps = {
  memories: readonly MemoryGalleryItem[];
  failedImageIds: ReadonlySet<string>;
  onImageError: (imageId: string) => void;
};

export function MemoryGallery({
  memories,
  failedImageIds,
  onImageError,
}: MemoryGalleryProps): React.JSX.Element {
  return (
    <section
      className={styles.memories}
      data-letter-memory-gallery
      aria-labelledby="memories-heading"
    >
      <h2 id="memories-heading">
        <span aria-hidden="true">＞</span> Every version of life is better with
        you in it. <span aria-hidden="true">♡ ＜</span>
      </h2>
      <div
        className={styles.memoryGrid}
        role="list"
        aria-label="Letter memories"
      >
        {memories.map((memory) => (
          <figure
            className={styles.memoryCard}
            data-memory-card
            role="listitem"
            key={memory.id}
          >
            {failedImageIds.has(memory.id) ? (
              <div className={styles.imageFallback} role="status">
                This image is unavailable right now.
              </div>
            ) : (
              <Image
                className={styles.memoryImage}
                src={memory.src}
                alt={memory.caption}
                width={720}
                height={480}
                sizes="(max-width: 720px) 86vw, (max-width: 1040px) 29vw, 280px"
                loading="lazy"
                decoding="async"
                unoptimized
                onError={() => onImageError(memory.id)}
              />
            )}
            <figcaption>
              <span className={styles.memoryCaptionHeart} aria-hidden="true">
                ♡
              </span>
              <span className={styles.memoryCaptionText}>{memory.caption}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
