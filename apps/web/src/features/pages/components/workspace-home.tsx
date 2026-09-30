import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import homeReference from "../../../../assets/home.png";
import { categoryThumbnails } from "../../../lib/category-thumbnails";
import { HowLetterlyWorks } from "./how-letterly-works";
import { WorkspaceFaq } from "./workspace-faq";
import styles from "./workspace-home.module.css";

type BenefitIconName = "heart" | "pencil" | "link" | "gift";

type HomeCategory = {
  key: keyof typeof categoryThumbnails;
  thumbnail: StaticImageData;
  description: string;
  isAvailable: boolean;
  title: string;
};

const homeCategories: HomeCategory[] = [
  {
    key: "confession",
    thumbnail: categoryThumbnails.confession,
    title: "Confession",
    description: "Say what is in your heart.",
    isAvailable: true,
  },
  {
    key: "birthday",
    thumbnail: categoryThumbnails.birthday,
    title: "Birthday",
    description: "Make their day extra special.",
    isAvailable: false,
  },
  {
    key: "anniversary",
    thumbnail: categoryThumbnails.anniversary,
    title: "Anniversary",
    description: "Celebrate love and milestones.",
    isAvailable: false,
  },
  {
    key: "thank-you",
    thumbnail: categoryThumbnails["thank-you"],
    title: "Thank You",
    description: "Put your gratitude into words.",
    isAvailable: false,
  },
];

const benefits = [
  {
    icon: "heart",
    title: "Thoughtful Designs",
    description: "Choose a design for the moment.",
  },
  {
    icon: "pencil",
    title: "Personalize Your Page",
    description: "Add photos, music, questions, and more.",
  },
  {
    icon: "link",
    title: "Share Easily",
    description: "Send one personal link when it is ready.",
  },
  {
    icon: "gift",
    title: "Made for Meaning",
    description: "Begin with a confession from the heart.",
  },
] as const satisfies ReadonlyArray<{
  icon: BenefitIconName;
  title: string;
  description: string;
}>;

function BenefitIcon({ name }: { name: BenefitIconName }): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className={styles.benefitIcon}
      fill="none"
      viewBox="0 0 32 32"
    >
      {name === "heart" ? (
        <path d="M16 26.5S4.75 20 4.75 12.25A6.25 6.25 0 0 1 16 8.5a6.25 6.25 0 0 1 11.25 3.75C27.25 20 16 26.5 16 26.5Z" />
      ) : null}
      {name === "pencil" ? (
        <>
          <path d="m7 24 4.3-1.05L25 9.25a3.18 3.18 0 0 0-4.5-4.5L6.8 18.45 7 24Z" />
          <path d="m17.75 7.5 4.75 4.75M6.8 18.45l4.5 4.5" />
        </>
      ) : null}
      {name === "link" ? (
        <>
          <path d="m13.2 19.2-2.4 2.4a4.53 4.53 0 0 1-6.4-6.4l4.8-4.8a4.53 4.53 0 0 1 6.4 0" />
          <path d="m18.8 12.8 2.4-2.4a4.53 4.53 0 0 1 6.4 6.4l-4.8 4.8a4.53 4.53 0 0 1-6.4 0M11.75 20.25l8.5-8.5" />
        </>
      ) : null}
      {name === "gift" ? (
        <>
          <path d="M5 13.25h22V27H5zM3.5 9h25v4.25h-25zM16 9v18" />
          <path d="M16 9H9.75a3.25 3.25 0 1 1 3.25-3.25C13 7.55 16 9 16 9ZM16 9h6.25A3.25 3.25 0 1 0 19 5.75C19 7.55 16 9 16 9Z" />
        </>
      ) : null}
    </svg>
  );
}

function ArrowIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path
        d="M4.25 10h11.5m-4-4 4 4-4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function CategoryCard({
  category,
}: {
  category: HomeCategory;
}): React.JSX.Element {
  const content = (
    <>
      <div className={styles.categoryArtwork} aria-hidden="true">
        <Image
          alt=""
          className={styles.categoryImage}
          data-category-thumbnail={category.key}
          fill
          sizes="(min-width: 80rem) 18vw, (min-width: 64rem) 33vw, (min-width: 40rem) 45vw, calc(100vw - 2.5rem)"
          src={category.thumbnail}
        />
      </div>
      <div className={styles.categoryBody}>
        <div className={styles.categoryCopy}>
          <h3>{category.title}</h3>
          <p>{category.description}</p>
          {!category.isAvailable ? (
            <span className={styles.comingSoon}>Coming soon</span>
          ) : null}
        </div>
        <span className={styles.categoryArrow} aria-hidden="true">
          <ArrowIcon />
        </span>
      </div>
    </>
  );

  return (
    <li>
      {category.isAvailable ? (
        <Link className={styles.categoryCard} href="/templates/confession">
          {content}
          <span className="sr-only">Browse Confession category</span>
        </Link>
      ) : (
        <article className={`${styles.categoryCard} ${styles.unavailableCard}`}>
          {content}
        </article>
      )}
    </li>
  );
}

export function WorkspaceHome(): React.JSX.Element {
  return (
    <main className={styles.page} id="dashboard-content">
      <section className={styles.hero} aria-labelledby="workspace-home-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Turns feelings into a shared moment</p>
          <h1 id="workspace-home-title">
            Create, Personalize,
            <br />
            Share with <em>Love.</em>
          </h1>
          <p className={styles.heroDescription}>
            Create a personal page for heartfelt messages, celebrations,
            confessions, and meaningful occasions, then share it through one
            unique link.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.heroAction} href="/templates">
              Create a Letter
            </Link>
          </div>
        </div>

        <figure
          className={styles.heroArtwork}
          aria-label="A pink envelope with a wax seal, letter, flowers, ribbon, and photograph"
        >
          <Image
            alt=""
            aria-hidden="true"
            className={styles.heroReference}
            src={homeReference}
            preload
            unoptimized
          />
        </figure>
      </section>

      <section className={styles.benefitStrip} aria-label="Why choose Letterly">
        <ul>
          {benefits.map((benefit) => (
            <li key={benefit.title}>
              <span className={styles.benefitIconFrame}>
                <BenefitIcon name={benefit.icon} />
              </span>
              <div>
                <h2>{benefit.title}</h2>
                <p>{benefit.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.categories} aria-labelledby="categories-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Find the right way to say it</p>
            <h2 id="categories-title">Explore Our Categories</h2>
          </div>
          <Link className={styles.browseAllAction} href="/templates">
            Browse All Categories
            <ArrowIcon />
          </Link>
        </div>

        <ul className={styles.categoryGrid}>
          {homeCategories.map((category) => (
            <CategoryCard key={category.title} category={category} />
          ))}
        </ul>
      </section>

      <HowLetterlyWorks />
      <WorkspaceFaq />
    </main>
  );
}
