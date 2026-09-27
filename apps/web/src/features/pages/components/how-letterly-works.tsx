import Link from "next/link";
import styles from "./how-letterly-works.module.css";

type StepKind = "choose" | "write" | "preview" | "publish";

type Step = {
  action: string;
  description: string;
  eyebrow: string;
  kind: StepKind;
  number: number;
  title: string;
};

const steps: readonly Step[] = [
  {
    number: 1,
    kind: "choose",
    eyebrow: "Choose",
    title: "Start with a category.",
    description:
      "Browse the gallery and choose a format that fits the mood, moment, and person you have in mind.",
    action: "Explore categories",
  },
  {
    number: 2,
    kind: "write",
    eyebrow: "Write",
    title: "Build around your message.",
    description:
      "Add your words and complete the sections that belong to the selected design.",
    action: "Start writing",
  },
  {
    number: 3,
    kind: "preview",
    eyebrow: "Preview",
    title: "See the finished experience.",
    description:
      "Review the page as a recipient will see it, including its layout and interactions.",
    action: "Preview your page",
  },
  {
    number: 4,
    kind: "publish",
    eyebrow: "Publish",
    title: "Share it when ready.",
    description:
      "Keep the draft private while you work, then publish and send the finished page when the moment feels right.",
    action: "Get ready to share",
  },
];

function ArrowIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path d="M4 10h12m-4-4 4 4-4 4" />
    </svg>
  );
}

function TinyHeart(): React.JSX.Element {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M12 20.2S4.5 15.9 4.5 10.7A4.2 4.2 0 0 1 12 8.1a4.2 4.2 0 0 1 7.5 2.6c0 5.2-7.5 9.5-7.5 9.5Z" />
    </svg>
  );
}

function ChooseIllustration(): React.JSX.Element {
  return (
    <div className={`${styles.scene} ${styles.chooseScene}`}>
      <div className={`${styles.backCard} ${styles.backCardLeft}`}>
        <span className={styles.miniLandscape} />
        <small>Letters</small>
      </div>
      <div className={`${styles.backCard} ${styles.backCardRight}`}>
        <span className={styles.miniFlowers} />
        <small>Moments</small>
      </div>
      <div className={styles.libraryCard}>
        <span className={styles.sprigIcon}>⌁</span>
        <small>Category gallery</small>
        <strong>Pick a place to begin</strong>
        <i />
      </div>
      <div className={styles.libraryTabs}>
        <span className={styles.gridMark} aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
        <span>Letters</span><b>•</b><span>Notes</span><b>•</b>
        <span>Occasions</span><b>•</b><span>More</span>
      </div>
      <p className={`${styles.handNote} ${styles.chooseNote}`}>
        So many<br />beautiful<br />beginnings
        <TinyHeart />
      </p>
    </div>
  );
}

function WriteIllustration(): React.JSX.Element {
  return (
    <div className={`${styles.scene} ${styles.writeScene}`}>
      <span className={styles.leafBranch} aria-hidden="true">
        <i /><i /><i /><i /><i />
      </span>
      <div className={`${styles.paperLayer} ${styles.paperLayerOne}`} />
      <div className={`${styles.paperLayer} ${styles.paperLayerTwo}`} />
      <div className={styles.editorCard}>
        <span className={styles.editorSpark}>✧</span>
        <small>Page editor</small>
        <strong>Write what matters</strong>
        <i className={styles.goldRule} />
        <div className={styles.editorToolbar}>
          <b>B</b><em>I</em><span>↗</span><span>•••</span>
        </div>
        <div className={styles.editorInput}>Start writing your letter...</div>
      </div>
      <span className={styles.pen} aria-hidden="true" />
      <p className={`${styles.handNote} ${styles.writeNote}`}>
        Different<br />moments.<br />A kinder<br />world.
        <TinyHeart />
      </p>
    </div>
  );
}

function PreviewIllustration(): React.JSX.Element {
  return (
    <div className={`${styles.scene} ${styles.previewScene}`}>
      <div className={styles.previewBack} />
      <div className={styles.previewCard}>
        <span className={styles.eyeIcon} aria-hidden="true">◉</span>
        <small>Preview mode</small>
        <strong>See it as they will</strong>
        <i className={styles.goldRule} />
        <div className={styles.previewPhoto}>
          <span className={styles.previewSun} />
          <span className={styles.previewHills} />
        </div>
        <div className={styles.previewLetter}>
          <span>A note for you</span><i /><i /><i />
        </div>
      </div>
      <span aria-hidden="true" className={`${styles.previewArrow} ${styles.previewArrowLeft}`}>‹</span>
      <span aria-hidden="true" className={`${styles.previewArrow} ${styles.previewArrowRight}`}>›</span>
      <p className={`${styles.handNote} ${styles.previewNote}`}>
        Like a<br />little preview<br />of a big feeling.
        <TinyHeart />
      </p>
    </div>
  );
}

function PublishIllustration(): React.JSX.Element {
  return (
    <div className={`${styles.scene} ${styles.publishScene}`}>
      <span className={styles.flowerSprig} aria-hidden="true">
        <i /><i /><i /><i /><i /><i />
      </span>
      <div className={`${styles.paperLayer} ${styles.publishLayerOne}`} />
      <div className={`${styles.paperLayer} ${styles.publishLayerTwo}`} />
      <div className={styles.publishCard}>
        <span className={styles.sendIcon}>⌁</span>
        <small>Published page</small>
        <strong>Ready to share</strong>
        <i className={styles.goldRule} />
        <div className={styles.shareBar}>
          <span aria-hidden="true">↗</span>
          <small>Your page is ready</small>
          <b>Copy link</b>
        </div>
      </div>
      <p className={`${styles.handNote} ${styles.publishNote}`}>
        Share<br />more kindness<br />in the world
        <TinyHeart />
      </p>
    </div>
  );
}

function StepIllustration({ kind }: { kind: StepKind }): React.JSX.Element {
  if (kind === "choose") return <ChooseIllustration />;
  if (kind === "write") return <WriteIllustration />;
  if (kind === "preview") return <PreviewIllustration />;
  return <PublishIllustration />;
}

export function HowLetterlyWorks(): React.JSX.Element {
  return (
    <section className={styles.section} aria-labelledby="how-letterly-works-title">
      <header className={styles.heading}>
        <h2 id="how-letterly-works-title">How Letterly works</h2>
        <div>
          Every design has its own layout and features. Letterly keeps the
          process clear from your first choice to the final share.
        </div>
      </header>

      <ol className={styles.timeline}>
        {steps.map((step) => (
          <li className={styles.step} data-step={step.number} key={step.number}>
            <div className={styles.illustration}>
              <StepIllustration kind={step.kind} />
            </div>
            <span className={styles.stepNumber} aria-hidden="true">{step.number}</span>
            <div className={styles.stepCopy}>
              <p>{step.eyebrow}</p>
              <h3>{step.title}</h3>
              <div>{step.description}</div>
              <Link href="/templates">
                {step.action}
                <ArrowIcon />
              </Link>
            </div>
          </li>
        ))}
      </ol>

      <div className={styles.closing} aria-hidden="true">
        <span /><TinyHeart /><span />
        <p>Meaningful moments, beautifully shared</p>
      </div>
    </section>
  );
}
