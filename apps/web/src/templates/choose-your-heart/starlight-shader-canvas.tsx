import styles from "./choose-your-heart.module.css";

const PETALS = [
  {
    gradient: "from-[#8c1d40] to-[#ffb2bf]",
    opacity: "opacity-70",
    width: "14px",
    height: "18px",
    left: "12%",
    duration: "9s",
    delay: "0s",
  },
  {
    gradient: "from-[#9e1c45] to-[#ffdadb]",
    opacity: "opacity-80",
    width: "18px",
    height: "22px",
    left: "28%",
    duration: "12s",
    delay: "3s",
  },
  {
    gradient: "from-[#6c002a] to-[#ffb2bf]",
    opacity: "opacity-65",
    width: "12px",
    height: "16px",
    left: "68%",
    duration: "10s",
    delay: "1.5s",
  },
  {
    gradient: "from-[#8c1d40] to-[#feafb5]",
    opacity: "opacity-75",
    width: "16px",
    height: "20px",
    left: "85%",
    duration: "13s",
    delay: "4.5s",
  },
  {
    gradient: "from-[#ba1a1a] to-[#ffb2bf]",
    opacity: "opacity-60",
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
        className={`absolute -top-32 left-1/2 h-[580px] w-[850px] -translate-x-1/2 bg-gradient-to-b from-[#8c1d40]/40 via-[#5b378c]/25 to-transparent blur-3xl ${styles.glowPulse}`}
      />
      <div
        className={`absolute right-1/4 bottom-0 h-[480px] w-[650px] bg-gradient-to-t from-[#6c002a]/35 via-[#9e1c45]/20 to-transparent blur-3xl ${styles.glowPulse}`}
        style={{ animationDelay: "2s" }}
      />
      <div className="absolute top-1/3 left-10 h-96 w-96 rounded-full bg-[#ffb2bf]/15 blur-[90px]" />
      <div className="absolute top-1/4 right-8 h-80 w-80 rounded-full bg-[#8c1d40]/20 blur-[80px]" />

      {/* Floating Valentine rose petal ambient particles */}
      {PETALS.map((petal, index) => (
        <div
          key={index}
          data-cyh-petal="true"
          className={`${styles.petal} bg-gradient-to-tr ${petal.gradient} ${petal.opacity}`}
          style={{
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
