export function BirthdayWishThumbnail({
  id,
  letterTitle,
}: {
  id: string;
  letterTitle?: string;
}): React.JSX.Element {
  const title = letterTitle?.trim() || "A birthday wish written for you";
  const headingId = `${id}-heading`;
  const pedestalGradId = `${id}-pedestalGrad`;
  const chocoGradId = `${id}-chocoGrad`;
  const vanillaGradId = `${id}-vanillaGrad`;
  const flameHaloId = `${id}-flameHalo`;
  const flameCoreId = `${id}-flameCore`;
  const candleGradId = `${id}-candleGrad`;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "360px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background:
          "radial-gradient(circle at 50% 28%, rgba(245, 196, 105, 0.22), rgba(194, 89, 26, 0.1) 42%, transparent 72%), linear-gradient(165deg, #100a06 0%, #20130b 52%, #0d0805 100%)",
        color: "#fff9ef",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <section
        aria-labelledby={headingId}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "360px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: "10px",
          padding: "18px 20px 16px",
          borderRadius: "24px",
          background:
            "radial-gradient(ellipse at 50% 16%, rgba(245, 196, 105, 0.18) 0%, transparent 64%), linear-gradient(180deg, rgba(38, 23, 14, 0.96) 0%, rgba(20, 12, 7, 0.98) 100%)",
          border: "1px solid rgba(226, 179, 98, 0.38)",
          boxShadow:
            "0 24px 60px rgba(9, 5, 3, 0.65), 0 0 0 1px rgba(255, 220, 150, 0.08), inset 0 1px 0 rgba(255, 245, 225, 0.25)",
          boxSizing: "border-box",
        }}
      >
        {/* Inner Subtle Dashed Border */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "8px",
            border: "1px dashed rgba(226, 179, 98, 0.2)",
            borderRadius: "18px",
            pointerEvents: "none",
          }}
        />

        {/* Centered Kicker Ribbon */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "4px 14px",
            borderRadius: "999px",
            background: "rgba(245, 196, 105, 0.12)",
            border: "1px solid rgba(226, 179, 98, 0.32)",
            color: "#f5c469",
            fontSize: "0.64rem",
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ fontSize: "0.6rem" }}>✦</span>
          <span>Golden Hour Edition · For</span>
        </div>

        {/* Centered Title */}
        <h2
          id={headingId}
          style={{
            margin: "0",
            color: "#fff9ef",
            fontFamily: "var(--font-display, serif)",
            fontSize: "1.4rem",
            fontWeight: 600,
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
            textAlign: "center",
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </h2>

        {/* Centered Midnight Patisserie Cake Illustration */}
        <div
          aria-hidden="true"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            margin: "2px 0",
          }}
        >
          <svg
            width="140"
            height="110"
            viewBox="0 0 130 115"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: "block", margin: "0 auto" }}
          >
            <defs>
              {/* Brass Pedestal Gradient */}
              <linearGradient
                id={pedestalGradId}
                x1="20"
                y1="90"
                x2="110"
                y2="110"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#966516" />
                <stop offset="25%" stopColor="#d49b3b" />
                <stop offset="50%" stopColor="#ffe5a6" />
                <stop offset="75%" stopColor="#d49b3b" />
                <stop offset="100%" stopColor="#805012" />
              </linearGradient>

              {/* Dark Chocolate Tier Gradient */}
              <linearGradient
                id={chocoGradId}
                x1="25"
                y1="64"
                x2="105"
                y2="92"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#3d2114" />
                <stop offset="35%" stopColor="#28150c" />
                <stop offset="70%" stopColor="#1c0e08" />
                <stop offset="100%" stopColor="#140a05" />
              </linearGradient>

              {/* Whipped Vanilla Top Tier Gradient */}
              <linearGradient
                id={vanillaGradId}
                x1="38"
                y1="44"
                x2="92"
                y2="66"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="45%" stopColor="#fff8ed" />
                <stop offset="85%" stopColor="#f7e6cc" />
                <stop offset="100%" stopColor="#ebd4b0" />
              </linearGradient>

              {/* Candle Flame Glow Gradient */}
              <radialGradient
                id={flameHaloId}
                cx="50%"
                cy="50%"
                r="50%"
                fx="50%"
                fy="50%"
              >
                <stop offset="0%" stopColor="#ffd97d" stopOpacity="0.75" />
                <stop offset="45%" stopColor="#f5a623" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#f5a623" stopOpacity="0" />
              </radialGradient>

              {/* Candle Flame Core */}
              <linearGradient id={flameCoreId} x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#ff5722" />
                <stop offset="30%" stopColor="#ffb300" />
                <stop offset="70%" stopColor="#fff59d" />
                <stop offset="100%" stopColor="#ffffff" />
              </linearGradient>

              {/* Candle Body Gradient */}
              <linearGradient id={candleGradId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#e8d5b5" />
                <stop offset="50%" stopColor="#fffdf9" />
                <stop offset="100%" stopColor="#cfb895" />
              </linearGradient>
            </defs>

            {/* 1. Pedestal Stand */}
            <ellipse
              cx="65"
              cy="105"
              rx="38"
              ry="5.5"
              fill={`url(#${pedestalGradId})`}
            />
            <path
              d="M58 92 H72 L69 104 H61 Z"
              fill={`url(#${pedestalGradId})`}
            />
            <ellipse
              cx="65"
              cy="92"
              rx="46"
              ry="6.5"
              fill={`url(#${pedestalGradId})`}
            />
            <ellipse
              cx="65"
              cy="91.5"
              rx="44"
              ry="5"
              fill="#f5c469"
              opacity="0.4"
            />

            {/* 2. Bottom Tier: Dark Belgian Chocolate */}
            <path
              d="M26 71 C26 66 104 66 104 71 V87 C104 92 26 92 26 87 Z"
              fill={`url(#${chocoGradId})`}
            />
            <ellipse cx="65" cy="71" rx="39" ry="5.5" fill="#4a2a1b" />
            {/* Gold Pearl Dragees around Base */}
            {[30, 36, 43, 50, 57, 65, 73, 80, 87, 94, 100].map((cx, i) => (
              <circle
                key={i}
                cx={cx}
                cy={87 + Math.sin((i / 10) * Math.PI) * 3}
                r="1.7"
                fill="#ffd97d"
                stroke="#8a5a14"
                strokeWidth="0.5"
              />
            ))}
            {/* Gold Flakes */}
            <circle cx="48" cy="78" r="1.2" fill="#f5c469" />
            <circle cx="78" cy="80" r="1" fill="#ffe5a6" />
            <circle cx="62" cy="82" r="1.4" fill="#f5c469" />
            <circle cx="88" cy="76" r="0.9" fill="#ffd97d" />

            {/* 3. Top Tier: Whipped Vanilla Mascarpone */}
            <path
              d="M38 52 C38 48 92 48 92 52 V66 C92 70 38 70 38 66 Z"
              fill={`url(#${vanillaGradId})`}
            />
            <ellipse cx="65" cy="52" rx="27" ry="4" fill="#ffffff" />
            {/* Piped Scalloped Rims */}
            {[42, 49, 57, 65, 73, 81, 88].map((cx, i) => (
              <ellipse
                key={i}
                cx={cx}
                cy={52.5 + Math.sin((i / 6) * Math.PI) * 1.5}
                rx="3.5"
                ry="2"
                fill="#ffffff"
                stroke="#edd5b3"
                strokeWidth="0.6"
              />
            ))}

            {/* 4. Three Golden Candles */}
            {/* Candle 1 (Left) */}
            <rect
              x="47"
              y="34"
              width="4.5"
              height="17"
              rx="1.5"
              fill={`url(#${candleGradId})`}
              stroke="#c29b53"
              strokeWidth="0.6"
            />
            <line
              x1="49.25"
              y1="34"
              x2="49.25"
              y2="30.5"
              stroke="#3d2114"
              strokeWidth="1"
            />
            <circle cx="49.25" cy="24" r="10" fill={`url(#${flameHaloId})`} />
            <path
              d="M49.25 18 C51.5 22 52.5 25 51.5 28 C50.5 30 48 30 47 28 C46 25 47 22 49.25 18 Z"
              fill={`url(#${flameCoreId})`}
            />

            {/* Candle 2 (Center - Slightly Taller) */}
            <rect
              x="62.75"
              y="30"
              width="4.5"
              height="21"
              rx="1.5"
              fill={`url(#${candleGradId})`}
              stroke="#c29b53"
              strokeWidth="0.6"
            />
            <line
              x1="65"
              y1="30"
              x2="65"
              y2="26.5"
              stroke="#3d2114"
              strokeWidth="1"
            />
            <circle cx="65" cy="19" r="12" fill={`url(#${flameHaloId})`} />
            <path
              d="M65 12 C67.8 17 68.8 20.5 67.8 24 C66.8 26.5 63.2 26.5 62.2 24 C61.2 20.5 62.2 17 65 12 Z"
              fill={`url(#${flameCoreId})`}
            />

            {/* Candle 3 (Right) */}
            <rect
              x="78.5"
              y="34"
              width="4.5"
              height="17"
              rx="1.5"
              fill={`url(#${candleGradId})`}
              stroke="#c29b53"
              strokeWidth="0.6"
            />
            <line
              x1="80.75"
              y1="34"
              x2="80.75"
              y2="30.5"
              stroke="#3d2114"
              strokeWidth="1"
            />
            <circle cx="80.75" cy="24" r="10" fill={`url(#${flameHaloId})`} />
            <path
              d="M80.75 18 C83 22 84 25 83 28 C82 30 79.5 30 78.5 28 C77.5 25 78.5 22 80.75 18 Z"
              fill={`url(#${flameCoreId})`}
            />

            {/* Sparkles around cake */}
            <path
              d="M24 45 L25 41 L26 45 L30 46 L26 47 L25 51 L24 47 L20 46 Z"
              fill="#ffd97d"
              opacity="0.85"
            />
            <path
              d="M106 38 L107 35 L108 38 L111 39 L108 40 L107 43 L106 40 L103 39 Z"
              fill="#ffe5a6"
              opacity="0.8"
            />
          </svg>
        </div>

        {/* Centered Wishes Status Tracker */}
        <div
          aria-hidden="true"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "6px",
          }}
        >
          {["Wish 1 · Sealed", "Wish 2 · Sealed", "Wish 3 · Sealed"].map(
            (label, i) => (
              <span
                key={i}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "3px 9px",
                  borderRadius: "999px",
                  background: "rgba(245, 196, 105, 0.12)",
                  border: "1px solid rgba(245, 196, 105, 0.28)",
                  color: "#ffd97d",
                  fontSize: "0.62rem",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                }}
              >
                ✦ {label}
              </span>
            ),
          )}
        </div>

        {/* Centered Action Button */}
        <div
          aria-hidden="true"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "7px 18px",
            borderRadius: "999px",
            background:
              "linear-gradient(180deg, #ffe5a6 0%, #f5c469 45%, #d49b3b 100%)",
            color: "#180e07",
            boxShadow:
              "0 10px 24px rgba(245, 196, 105, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
            fontSize: "0.74rem",
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
            <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
            <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
          </svg>
          <span>Blow out the candle</span>
        </div>

        {/* Centered Subtitle / Hint */}
        <p
          style={{
            margin: "0",
            color: "#d0b99c",
            fontSize: "0.65rem",
            lineHeight: 1.4,
            textAlign: "center",
            maxWidth: "280px",
          }}
        >
          Tap candles or blow out to open your celebration edition
        </p>
      </section>
    </div>
  );
}
