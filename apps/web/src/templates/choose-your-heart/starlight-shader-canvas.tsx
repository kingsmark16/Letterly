import styles from "./choose-your-heart.module.css";

const PETALS = [
  {
    background: "linear-gradient(to top right, #8c1d40, #ffb2bf)",
    opacity: 0.7,
    width: "14px",
    height: "18px",
    left: "12%",
    duration: "9s",
    delay: "0s",
  },
  {
    background: "linear-gradient(to top right, #9e1c45, #ffdadb)",
    opacity: 0.8,
    width: "18px",
    height: "22px",
    left: "28%",
    duration: "12s",
    delay: "3s",
  },
  {
    background: "linear-gradient(to top right, #6c002a, #ffb2bf)",
    opacity: 0.65,
    width: "12px",
    height: "16px",
    left: "68%",
    duration: "10s",
    delay: "1.5s",
  },
  {
    background: "linear-gradient(to top right, #8c1d40, #feafb5)",
    opacity: 0.75,
    width: "16px",
    height: "20px",
    left: "85%",
    duration: "13s",
    delay: "4.5s",
  },
  {
    background: "linear-gradient(to top right, #ba1a1a, #ffb2bf)",
    opacity: 0.6,
    width: "15px",
    height: "19px",
    left: "46%",
    duration: "11s",
    delay: "6s",
  },
] as const;

export function StarlightShaderCanvas({
  contained = false,
}: {
  contained?: boolean;
}): React.JSX.Element {
  return (
    <div
      className={`pointer-events-none ${
        contained ? "absolute" : "fixed"
      } inset-0 z-0 overflow-hidden`}
      aria-hidden="true"
    >
      {/* Radial twilight atmosphere blooms & celestial depth gradients */}
      <div
        className={`absolute -top-32 left-1/2 -translate-x-1/2 blur-3xl ${styles.glowPulse}`}
        style={{
          height: 580,
          width: 850,
          backgroundImage:
            "linear-gradient(to bottom, rgba(140, 29, 64, 0.4), rgba(91, 55, 140, 0.25), transparent)",
        }}
      />
      <div
        className={`absolute right-1/4 bottom-0 blur-3xl ${styles.glowPulse}`}
        style={{
          height: 480,
          width: 650,
          animationDelay: "2s",
          backgroundImage:
            "linear-gradient(to top, rgba(108, 0, 42, 0.35), rgba(158, 28, 69, 0.2), transparent)",
        }}
      />
      <div
        className="absolute top-1/3 left-10 h-96 w-96 rounded-full"
        style={{
          backgroundColor: "rgba(255, 178, 191, 0.15)",
          filter: "blur(90px)",
        }}
      />
      <div
        className="absolute top-1/4 right-8 h-80 w-80 rounded-full"
        style={{
          backgroundColor: "rgba(140, 29, 64, 0.2)",
          filter: "blur(80px)",
        }}
      />

      {/* Floating Valentine rose petal ambient particles */}
      {PETALS.map((petal, index) => (
        <div
          key={index}
          data-cyh-petal="true"
          className={styles.petal}
          style={{
            background: petal.background,
            opacity: petal.opacity,
            width: petal.width,
            height: petal.height,
            left: petal.left,
            animationDuration: petal.duration,
            animationDelay: petal.delay,
          }}
        />
      ))}
    </div>
  );
}
