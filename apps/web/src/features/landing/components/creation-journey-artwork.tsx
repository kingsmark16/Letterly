import { useId } from "react";
import confessionThumbnail from "../../../../assets/categories/confession/confession-thumbnail.png";
import anniversaryThumbnail from "../../../../assets/categories/anniversary/anniversary-thumbnail.png";
import holdingHands from "../../../templates/secret-letter/assets/holding-hands.jpg";
import styles from "./how-letterly-works.module.css";

export function CreationJourneyArtwork(): React.JSX.Element {
  const rawId = useId();
  const id = "journey-" + rawId.replace(/[^a-zA-Z0-9]/g, "");

  return (
    <svg
      className={styles.artwork}
      viewBox="0 0 480 400"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        {/* Soft luxury paper drop shadows */}
        <filter
          id={`${id}-paper-shadow`}
          x="-20%"
          y="-20%"
          width="140%"
          height="150%"
        >
          <feDropShadow
            dx="0"
            dy="14"
            stdDeviation="16"
            floodColor="#be123c"
            floodOpacity="0.14"
          />
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="6"
            floodColor="#0f172a"
            floodOpacity="0.06"
          />
        </filter>
        <filter
          id={`${id}-card-shadow`}
          x="-20%"
          y="-20%"
          width="140%"
          height="150%"
        >
          <feDropShadow
            dx="0"
            dy="10"
            stdDeviation="12"
            floodColor="#be123c"
            floodOpacity="0.12"
          />
          <feDropShadow
            dx="0"
            dy="3"
            stdDeviation="4"
            floodColor="#0f172a"
            floodOpacity="0.05"
          />
        </filter>
        <filter
          id={`${id}-phone-shadow`}
          x="-25%"
          y="-20%"
          width="150%"
          height="150%"
        >
          <feDropShadow
            dx="0"
            dy="18"
            stdDeviation="20"
            floodColor="#be123c"
            floodOpacity="0.18"
          />
          <feDropShadow
            dx="0"
            dy="6"
            stdDeviation="8"
            floodColor="#0f172a"
            floodOpacity="0.12"
          />
        </filter>
        <filter
          id={`${id}-seal-shadow`}
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
        >
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="5"
            floodColor="#4c0519"
            floodOpacity="0.4"
          />
        </filter>

        {/* 3D Lustrous Ruby Gem Radial Gradient */}
        <radialGradient id={`${id}-ruby-gem`} cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#fda4af" />
          <stop offset="25%" stopColor="#f43f5e" />
          <stop offset="60%" stopColor="#be123c" />
          <stop offset="100%" stopColor="#4c0519" />
        </radialGradient>

        {/* 3D Organic Wax Seal Radial Gradient */}
        <radialGradient id={`${id}-wax-base`} cx="32%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="35%" stopColor="#e11d48" />
          <stop offset="70%" stopColor="#be123c" />
          <stop offset="100%" stopColor="#4c0519" />
        </radialGradient>

        {/* 18K Two-Tone Gold Nib Gradient */}
        <linearGradient
          id={`${id}-gold-nib`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="25%" stopColor="#eab308" />
          <stop offset="50%" stopColor="#ca8a04" />
          <stop offset="75%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>

        {/* Fountain Pen Lacquer Body Gradient */}
        <linearGradient id={`${id}-pen-body`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4c0519" />
          <stop offset="28%" stopColor="#881337" />
          <stop offset="50%" stopColor="#e11d48" />
          <stop offset="72%" stopColor="#881337" />
          <stop offset="100%" stopColor="#4c0519" />
        </linearGradient>

        {/* Smartphone Titanium Frame */}
        <linearGradient
          id={`${id}-phone-frame`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#475569" />
          <stop offset="25%" stopColor="#94a3b8" />
          <stop offset="50%" stopColor="#334155" />
          <stop offset="75%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>

        {/* Glass Specular Reflection */}
        <linearGradient
          id={`${id}-glass-gleam`}
          x1="0%"
          y1="0%"
          x2="85%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="28%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Atmospheric Orbital Rings */}
      <ellipse
        cx="240"
        cy="220"
        rx="183"
        ry="150"
        stroke="currentColor"
        strokeWidth="0.6"
        opacity="0.25"
      />
      <ellipse
        cx="240"
        cy="220"
        rx="140"
        ry="115"
        stroke="currentColor"
        strokeWidth="0.4"
        strokeDasharray="3 6"
        opacity="0.18"
      />

      {/* Twinkling Celestial Cross-Sparks */}
      <path
        d="m74 87 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Zm319 217 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z"
        fill="currentColor"
        opacity="0.75"
      />

      {/* ========================================================================= */}
      {/* SCENE 0: Find your feeling. / Start with the right template               */}
      {/* ========================================================================= */}
      <g data-journey-scene="0" className={styles.sceneLayer}>
        {/* Soft Blush Mat / Tray */}
        <rect
          x="35"
          y="25"
          width="410"
          height="350"
          rx="18"
          fill="#fff5f7"
          stroke="#fecdd3"
          strokeWidth="0.8"
          filter={`url(#${id}-paper-shadow)`}
        />

        {/* Tilted Polaroid / Sample Card behind (tilted -8° around 140 190) */}
        <g transform="rotate(-8 140 190)" filter={`url(#${id}-card-shadow)`}>
          <rect
            x="60"
            y="65"
            width="170"
            height="240"
            rx="8"
            fill="#ffffff"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          <image
            href={anniversaryThumbnail.src}
            x="68"
            y="73"
            width="154"
            height="180"
            preserveAspectRatio="xMidYMid slice"
          />
          <text
            x="145"
            y="280"
            textAnchor="middle"
            fontFamily="var(--font-display)"
            fontSize="11"
            fontStyle="italic"
            fill="#475569"
          >
            Our Story Continues
          </text>
        </g>

        {/* Main Template Library Card (tilted +4° around 295 200) */}
        <g transform="rotate(4 295 200)" filter={`url(#${id}-paper-shadow)`}>
          <rect
            x="180"
            y="50"
            width="230"
            height="295"
            rx="12"
            fill="#ffffff"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          {/* Inner Gold Foil Inset Border */}
          <rect
            x="188"
            y="58"
            width="214"
            height="279"
            rx="8"
            fill="none"
            stroke="var(--scene-foil)"
            strokeWidth="0.75"
            strokeOpacity="0.3"
          />

          {/* Gold Botanical Sprig at Top */}
          <path
            d="M295 72 C295 66 292 63 289 65 C286 67 288 71 292 72 M295 72 C297 67 301 65 302 68 C303 71 299 73 295 75 M295 72 L295 82"
            fill="none"
            stroke="#ca8a04"
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* Header Typography */}
          <text
            x="295"
            y="94"
            textAnchor="middle"
            fontSize="7"
            fontFamily="sans-serif"
            fontWeight="700"
            letterSpacing="1.4"
            fill="#be123c"
          >
            TEMPLATE LIBRARY
          </text>
          <text
            x="295"
            y="114"
            textAnchor="middle"
            fontSize="14"
            fontFamily="var(--font-display)"
            fontWeight="600"
            fill="#0f172a"
          >
            Pick a place to begin
          </text>

          {/* Category Pill Filters */}
          <g transform="translate(196 126)">
            {/* Active: Letters */}
            <rect width="48" height="20" rx="10" fill="#be123c" />
            <text
              x="24"
              y="14"
              textAnchor="middle"
              fontSize="8"
              fontWeight="600"
              fill="#ffffff"
            >
              Letters
            </text>
            {/* Inactive: Notes */}
            <rect
              x="52"
              width="44"
              height="20"
              rx="10"
              fill="#f8fafc"
              stroke="#e2e8f0"
              strokeWidth="0.8"
            />
            <text
              x="74"
              y="14"
              textAnchor="middle"
              fontSize="8"
              fontWeight="500"
              fill="#64748b"
            >
              Notes
            </text>
            {/* Inactive: Occasions */}
            <rect
              x="100"
              width="56"
              height="20"
              rx="10"
              fill="#f8fafc"
              stroke="#e2e8f0"
              strokeWidth="0.8"
            />
            <text
              x="128"
              y="14"
              textAnchor="middle"
              fontSize="8"
              fontWeight="500"
              fill="#64748b"
            >
              Occasions
            </text>
            {/* Inactive: More */}
            <rect
              x="160"
              width="38"
              height="20"
              rx="10"
              fill="#f8fafc"
              stroke="#e2e8f0"
              strokeWidth="0.8"
            />
            <text
              x="179"
              y="14"
              textAnchor="middle"
              fontSize="8"
              fontWeight="500"
              fill="#64748b"
            >
              More
            </text>
          </g>

          {/* Embedded Real Photographic Card Preview */}
          <g transform="translate(196 156)">
            <rect
              width="198"
              height="155"
              rx="8"
              fill="#f8fafc"
              stroke="#e2e8f0"
              strokeWidth="0.8"
            />
            <image
              href={confessionThumbnail.src}
              x="2"
              y="2"
              width="194"
              height="151"
              preserveAspectRatio="xMidYMid slice"
            />
            {/* 3D Wax Seal Badge on top of the card */}
            <circle
              cx="168"
              cy="24"
              r="16"
              fill={`url(#${id}-wax-base)`}
              filter={`url(#${id}-seal-shadow)`}
            />
            <circle
              cx="168"
              cy="24"
              r="11"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1"
              strokeOpacity="0.4"
            />
            <path
              d="M168 28 C165 25 161 22 161 19 A4 4 0 0 1 168 17 A4 4 0 0 1 175 19 C175 22 171 25 168 28 Z"
              fill="#ffffff"
            />
          </g>
        </g>

        {/* Pinned Handwritten Note on Top Left */}
        <g transform="rotate(-12 60 70)" filter={`url(#${id}-card-shadow)`}>
          <rect
            x="10"
            y="45"
            width="130"
            height="64"
            rx="4"
            fill="#ffffff"
            stroke="#fecdd3"
            strokeWidth="0.8"
          />
          <text
            x="75"
            y="72"
            textAnchor="middle"
            fontFamily="var(--font-display)"
            fontStyle="italic"
            fontSize="9.5"
            fill="#be123c"
          >
            So many beautiful
          </text>
          <text
            x="75"
            y="88"
            textAnchor="middle"
            fontFamily="var(--font-display)"
            fontStyle="italic"
            fontSize="9.5"
            fill="#be123c"
          >
            beginnings ♡
          </text>
          {/* Animated Ink Loop */}
          <path
            data-journey-ink
            d="M30 96 C 50 106, 90 108, 120 94"
            fill="none"
            stroke="#be123c"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </g>
      </g>

      {/* ========================================================================= */}
      {/* SCENE 1: Make it yours. / Build around your message                       */}
      {/* ========================================================================= */}
      <g data-journey-scene="1" className={styles.sceneLayer}>
        {/* Soft Sage Mat / Desk Surface */}
        <rect
          x="35"
          y="25"
          width="410"
          height="350"
          rx="18"
          fill="#f6fcf8"
          stroke="#dcfce7"
          strokeWidth="0.8"
          filter={`url(#${id}-paper-shadow)`}
        />

        {/* Main Editor Card (centered, tilted -2° around 220 200) */}
        <g transform="rotate(-2 220 200)" filter={`url(#${id}-paper-shadow)`}>
          <rect
            x="70"
            y="50"
            width="270"
            height="295"
            rx="10"
            fill="#ffffff"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          {/* Gold Inset Border */}
          <rect
            x="78"
            y="58"
            width="254"
            height="279"
            rx="6"
            fill="none"
            stroke="#ca8a04"
            strokeWidth="0.6"
            strokeOpacity="0.3"
          />

          {/* Gold Star Foliage */}
          <path
            d="M205 74 L207 79 L212 80 L208 84 L209 89 L205 86 L201 89 L202 84 L198 80 L203 79 Z"
            fill="#eab308"
          />

          <text
            x="205"
            y="102"
            textAnchor="middle"
            fontSize="7"
            fontFamily="sans-serif"
            fontWeight="700"
            letterSpacing="1.2"
            fill="#be123c"
          >
            PAGE EDITOR
          </text>
          <text
            x="205"
            y="122"
            textAnchor="middle"
            fontSize="14"
            fontFamily="var(--font-display)"
            fontWeight="600"
            fill="#0f172a"
          >
            Write what matters
          </text>

          {/* Formatting Toolbar */}
          <g transform="translate(95 136)">
            <rect
              width="220"
              height="28"
              rx="6"
              fill="#f8fafc"
              stroke="#e2e8f0"
              strokeWidth="0.8"
            />
            <text
              x="24"
              y="18"
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill="#0f172a"
            >
              B
            </text>
            <text
              x="52"
              y="18"
              textAnchor="middle"
              fontSize="11"
              fontStyle="italic"
              fontWeight="600"
              fill="#0f172a"
            >
              I
            </text>
            <text
              x="80"
              y="18"
              textAnchor="middle"
              fontSize="11"
              fill="#64748b"
            >
              🔗
            </text>
            <line
              x1="104"
              y1="6"
              x2="104"
              y2="22"
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <circle cx="124" cy="14" r="2" fill="#64748b" />
            <circle cx="132" cy="14" r="2" fill="#64748b" />
            <circle cx="140" cy="14" r="2" fill="#64748b" />
          </g>

          {/* Ruled Stationery Letterhead */}
          <g transform="translate(95 180)">
            <rect
              width="220"
              height="140"
              rx="6"
              fill="#ffffff"
              stroke="#f1f5f9"
              strokeWidth="0.8"
            />
            <text
              x="14"
              y="24"
              fontFamily="var(--font-display)"
              fontStyle="italic"
              fontSize="11"
              fill="#94a3b8"
            >
              Start writing your letter...
            </text>
            {/* Animated Ink Lines for Writing Animation */}
            <path
              data-journey-ink
              d="M14 48 H190"
              stroke="#be123c"
              strokeWidth="1.75"
              strokeLinecap="round"
              opacity="0.85"
            />
            <path
              data-journey-ink
              d="M14 70 H170"
              stroke="#be123c"
              strokeWidth="1.75"
              strokeLinecap="round"
              opacity="0.75"
            />
            <path
              data-journey-ink
              d="M14 92 H140"
              stroke="#be123c"
              strokeWidth="1.75"
              strokeLinecap="round"
              opacity="0.65"
            />
            <path
              data-journey-ink
              d="M14 114 H100"
              stroke="#be123c"
              strokeWidth="1.75"
              strokeLinecap="round"
              opacity="0.5"
            />
          </g>
        </g>

        {/* Realistic Fresh Eucalyptus Sprig (behind the pen) */}
        <g transform="translate(325 120) rotate(15)">
          <path
            d="M0 0 Q 15 60 5 160"
            fill="none"
            stroke="#166534"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Leaves */}
          <ellipse
            cx="-8"
            cy="35"
            rx="14"
            ry="9"
            transform="rotate(-25 -8 35)"
            fill="#22c55e"
            fillOpacity="0.85"
            stroke="#15803d"
            strokeWidth="0.75"
          />
          <ellipse
            cx="14"
            cy="65"
            rx="16"
            ry="10"
            transform="rotate(30 14 65)"
            fill="#16a34a"
            fillOpacity="0.85"
            stroke="#15803d"
            strokeWidth="0.75"
          />
          <ellipse
            cx="-10"
            cy="100"
            rx="16"
            ry="11"
            transform="rotate(-20 -10 100)"
            fill="#22c55e"
            fillOpacity="0.85"
            stroke="#15803d"
            strokeWidth="0.75"
          />
          <ellipse
            cx="12"
            cy="130"
            rx="15"
            ry="10"
            transform="rotate(25 12 130)"
            fill="#16a34a"
            fillOpacity="0.85"
            stroke="#15803d"
            strokeWidth="0.75"
          />
        </g>

        {/* Realistic 3D 18K Gold Fountain Pen (tilted 32° around 365 210) */}
        <g transform="rotate(32 365 210)" filter={`url(#${id}-paper-shadow)`}>
          {/* Soft Shadow under pen */}
          <ellipse
            cx="365"
            cy="270"
            rx="8"
            ry="70"
            fill="#0f172a"
            fillOpacity="0.18"
          />
          {/* Burgundy Lacquer Barrel */}
          <rect
            x="358"
            y="90"
            width="14"
            height="150"
            rx="4"
            fill={`url(#${id}-pen-body)`}
          />
          {/* Gold Accent Rings */}
          <rect
            x="357"
            y="115"
            width="16"
            height="4"
            rx="1"
            fill={`url(#${id}-gold-nib)`}
          />
          <rect
            x="357"
            y="236"
            width="16"
            height="4"
            rx="1"
            fill={`url(#${id}-gold-nib)`}
          />
          {/* Gold Pocket Clip */}
          <rect
            x="364"
            y="95"
            width="2.5"
            height="45"
            rx="1"
            fill={`url(#${id}-gold-nib)`}
          />
          {/* Pen Section / Grip */}
          <path d="M359 240 L362 268 L368 268 L371 240 Z" fill="#1e293b" />
          {/* 18K Gold Nib with Breather Hole and Engraving */}
          <path
            d="M362 268 L360 286 L365 304 L370 286 L368 268 Z"
            fill={`url(#${id}-gold-nib)`}
            stroke="#a16207"
            strokeWidth="0.6"
          />
          <line
            x1="365"
            y1="274"
            x2="365"
            y2="303"
            stroke="#451a03"
            strokeWidth="0.6"
          />
          <circle cx="365" cy="285" r="1.5" fill="#451a03" />
        </g>

        {/* Pinned Handwritten Note on Right */}
        <g transform="rotate(6 405 180)" filter={`url(#${id}-card-shadow)`}>
          <rect
            x="350"
            y="240"
            width="105"
            height="68"
            rx="4"
            fill="#ffffff"
            stroke="#e2e8f0"
            strokeWidth="0.8"
          />
          <text
            x="402"
            y="262"
            textAnchor="middle"
            fontFamily="var(--font-display)"
            fontStyle="italic"
            fontSize="9"
            fill="#475569"
          >
            Different moments.
          </text>
          <text
            x="402"
            y="278"
            textAnchor="middle"
            fontFamily="var(--font-display)"
            fontStyle="italic"
            fontSize="9"
            fill="#475569"
          >
            A kinder world. ♡
          </text>
          <path
            data-journey-ink
            d="M365 292 C 385 298, 415 298, 435 290"
            fill="none"
            stroke="#be123c"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </g>
      </g>

      {/* ========================================================================= */}
      {/* SCENE 2: Take a little peek. / See the finished experience                */}
      {/* ========================================================================= */}
      <g data-journey-scene="2" className={styles.sceneLayer}>
        {/* Soft Ambient Glow Surface */}
        <rect
          x="35"
          y="25"
          width="410"
          height="350"
          rx="18"
          fill="#fdf4f7"
          stroke="#fce7f3"
          strokeWidth="0.8"
          filter={`url(#${id}-paper-shadow)`}
        />

        {/* Handwritten Note on Left */}
        <g transform="rotate(-8 90 220)" filter={`url(#${id}-card-shadow)`}>
          <rect
            x="25"
            y="180"
            width="125"
            height="74"
            rx="4"
            fill="#ffffff"
            stroke="#fbcfe8"
            strokeWidth="0.8"
          />
          <text
            x="87"
            y="206"
            textAnchor="middle"
            fontFamily="var(--font-display)"
            fontStyle="italic"
            fontSize="9.5"
            fill="#be123c"
          >
            Like a little preview
          </text>
          <text
            x="87"
            y="222"
            textAnchor="middle"
            fontFamily="var(--font-display)"
            fontStyle="italic"
            fontSize="9.5"
            fill="#be123c"
          >
            of a big feeling. ♡
          </text>
          <path
            data-journey-ink
            d="M45 238 C 65 246, 105 246, 130 236"
            fill="none"
            stroke="#be123c"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </g>

        {/* Realistic Smartphone / Glass Preview Mockup (Centered x=155 y=35) */}
        <g filter={`url(#${id}-phone-shadow)`}>
          {/* Outer Titanium Bezel Frame */}
          <rect
            x="155"
            y="35"
            width="170"
            height="330"
            rx="28"
            fill={`url(#${id}-phone-frame)`}
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
          {/* Inner Display Screen */}
          <rect
            x="162"
            y="42"
            width="156"
            height="316"
            rx="22"
            fill="#09090b"
          />

          {/* Dynamic Island / Speaker Pill */}
          <rect x="210" y="49" width="60" height="9" rx="4.5" fill="#1e293b" />

          {/* Header Inside Screen */}
          <text
            x="240"
            y="74"
            textAnchor="middle"
            fontSize="6.5"
            fontFamily="sans-serif"
            fontWeight="700"
            letterSpacing="1"
            fill="#fda4af"
          >
            PREVIEW MODE
          </text>
          <text
            x="240"
            y="88"
            textAnchor="middle"
            fontSize="10"
            fontFamily="var(--font-display)"
            fontWeight="600"
            fill="#ffffff"
          >
            See it as they will
          </text>

          {/* Real Embedded Photograph Inside the Phone */}
          <g transform="translate(170 98)">
            <rect width="140" height="145" rx="10" fill="#1e293b" />
            <image
              href={holdingHands.src}
              width="140"
              height="145"
              preserveAspectRatio="xMidYMid slice"
            />
            {/* Frosted Glass Note Inside Preview */}
            <rect
              x="10"
              y="90"
              width="120"
              height="45"
              rx="8"
              fill="rgba(255, 255, 255, 0.92)"
              filter={`url(#${id}-card-shadow)`}
            />
            <text
              x="70"
              y="108"
              textAnchor="middle"
              fontFamily="var(--font-display)"
              fontSize="9"
              fontWeight="600"
              fill="#0f172a"
            >
              A note for you ♡
            </text>
            <path
              data-journey-ink
              d="M25 120 H115"
              stroke="#be123c"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </g>

          {/* Navigation Controls (< and >) */}
          <g transform="translate(170 258)">
            <circle cx="20" cy="18" r="14" fill="#ffffff" fillOpacity="0.9" />
            <path
              d="M23 13 L17 18 L23 23"
              fill="none"
              stroke="#be123c"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <circle cx="120" cy="18" r="14" fill="#ffffff" fillOpacity="0.9" />
            <path
              d="M117 13 L123 18 L117 23"
              fill="none"
              stroke="#be123c"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Slider Dots */}
            <circle cx="60" cy="18" r="3" fill="#be123c" />
            <circle cx="70" cy="18" r="2.5" fill="#ffffff" fillOpacity="0.6" />
            <circle cx="80" cy="18" r="2.5" fill="#ffffff" fillOpacity="0.6" />
          </g>

          {/* Interactive Unlock Bar at Bottom */}
          <g transform="translate(185 304)">
            <rect
              width="110"
              height="26"
              rx="13"
              fill={`url(#${id}-ruby-gem)`}
            />
            <text
              x="55"
              y="17"
              textAnchor="middle"
              fontSize="8"
              fontWeight="600"
              fill="#ffffff"
            >
              Tap to open ✦
            </text>
          </g>

          {/* Diagonal Specular Reflection across Phone Screen */}
          <path
            d="M162 42 L250 42 L162 170 Z"
            fill={`url(#${id}-glass-gleam)`}
            opacity="0.6"
          />
        </g>

        {/* Handwritten Note on Right */}
        <g transform="rotate(7 395 240)" filter={`url(#${id}-card-shadow)`}>
          <rect
            x="340"
            y="200"
            width="115"
            height="66"
            rx="4"
            fill="#ffffff"
            stroke="#fbcfe8"
            strokeWidth="0.8"
          />
          <text
            x="397"
            y="226"
            textAnchor="middle"
            fontFamily="var(--font-display)"
            fontStyle="italic"
            fontSize="9"
            fill="#be123c"
          >
            It all comes
          </text>
          <text
            x="397"
            y="242"
            textAnchor="middle"
            fontFamily="var(--font-display)"
            fontStyle="italic"
            fontSize="9"
            fill="#be123c"
          >
            together here ♡
          </text>
          <path
            data-journey-ink
            d="M355 254 C 375 260, 415 260, 435 252"
            fill="none"
            stroke="#be123c"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </g>
      </g>

      {/* ========================================================================= */}
      {/* SCENE 3: Send a little love. / Share it when ready                         */}
      {/* ========================================================================= */}
      <g data-journey-scene="3" className={styles.sceneLayer}>
        {/* Soft Warm Champagne / Silk Mat */}
        <rect
          x="35"
          y="25"
          width="410"
          height="350"
          rx="18"
          fill="#fff8f5"
          stroke="#fed7aa"
          strokeWidth="0.8"
          filter={`url(#${id}-paper-shadow)`}
        />

        {/* Handwritten Note on Left */}
        <g transform="rotate(-10 90 120)" filter={`url(#${id}-card-shadow)`}>
          <rect
            x="20"
            y="80"
            width="125"
            height="74"
            rx="4"
            fill="#ffffff"
            stroke="#fed7aa"
            strokeWidth="0.8"
          />
          <text
            x="82"
            y="106"
            textAnchor="middle"
            fontFamily="var(--font-display)"
            fontStyle="italic"
            fontSize="9"
            fill="#475569"
          >
            A little moment
          </text>
          <text
            x="82"
            y="122"
            textAnchor="middle"
            fontFamily="var(--font-display)"
            fontStyle="italic"
            fontSize="9"
            fill="#475569"
          >
            can mean everything ♡
          </text>
          <path
            data-journey-ink
            d="M35 138 C 55 146, 95 146, 125 136"
            fill="none"
            stroke="#be123c"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </g>

        {/* Handcrafted Sealed Luxury Envelope in Background (tilted -8° around 190 200) */}
        <g transform="rotate(-8 190 200)" filter={`url(#${id}-paper-shadow)`}>
          <rect
            x="70"
            y="100"
            width="250"
            height="165"
            rx="8"
            fill="#faeaf1"
            stroke="#f43f5e"
            strokeWidth="1"
            strokeOpacity="0.4"
          />
          <path
            d="M70 100 L195 185 L320 100"
            fill="none"
            stroke="#be123c"
            strokeWidth="1.2"
            strokeOpacity="0.4"
          />
          <path
            d="M70 265 L170 175 M320 265 L220 175"
            fill="none"
            stroke="#be123c"
            strokeWidth="0.8"
            strokeOpacity="0.25"
          />
          {/* Wax seal on envelope flap */}
          <circle
            cx="195"
            cy="185"
            r="16"
            fill={`url(#${id}-wax-base)`}
            filter={`url(#${id}-seal-shadow)`}
          />
          <circle
            cx="195"
            cy="185"
            r="11"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1"
            strokeOpacity="0.4"
          />
        </g>

        {/* Main Published Page Card matching ref-how.png (Centered x=180 y=85) */}
        <g filter={`url(#${id}-card-shadow)`}>
          <rect
            x="180"
            y="75"
            width="240"
            height="215"
            rx="12"
            fill="#ffffff"
            stroke="#e2e8f0"
            strokeWidth="1"
          />

          {/* Paper Airplane / Share Icon at Top */}
          <path
            d="M300 96 L290 108 L310 102 Z M290 108 L296 114 L298 106 Z"
            fill="#ca8a04"
          />

          <text
            x="300"
            y="126"
            textAnchor="middle"
            fontSize="7"
            fontFamily="sans-serif"
            fontWeight="700"
            letterSpacing="1.2"
            fill="#be123c"
          >
            PUBLISHED PAGE
          </text>
          <text
            x="300"
            y="148"
            textAnchor="middle"
            fontSize="15"
            fontFamily="var(--font-display)"
            fontWeight="600"
            fill="#0f172a"
          >
            Ready to share
          </text>

          {/* Gold Divider Line */}
          <line
            x1="270"
            y1="162"
            x2="330"
            y2="162"
            stroke="#ca8a04"
            strokeWidth="1"
            strokeOpacity="0.5"
          />

          {/* Modern Link Sharing Pill Box inside the card */}
          <g transform="translate(196 182)">
            <rect
              width="208"
              height="44"
              rx="8"
              fill="#f8fafc"
              stroke="#e2e8f0"
              strokeWidth="0.8"
            />
            {/* Link Icon & Text */}
            <text x="14" y="27" fontSize="12">
              🔗
            </text>
            <text
              x="32"
              y="27"
              fontFamily="sans-serif"
              fontSize="9"
              fontWeight="500"
              fill="#475569"
            >
              Your page is ready
            </text>
            {/* Copy Link Button */}
            <rect
              x="136"
              y="7"
              width="64"
              height="30"
              rx="6"
              fill={`url(#${id}-ruby-gem)`}
            />
            <text
              x="168"
              y="26"
              textAnchor="middle"
              fontFamily="sans-serif"
              fontSize="8.5"
              fontWeight="600"
              fill="#ffffff"
            >
              Copy link
            </text>
          </g>

          <path
            data-journey-ink
            d="M200 252 H400"
            stroke="#be123c"
            strokeWidth="1.25"
            strokeLinecap="round"
            opacity="0.3"
          />
        </g>

        {/* Dried Flowers / Baby's Breath sprigs beside the card */}
        <g transform="translate(425 210) rotate(-15)">
          <path
            d="M0 60 Q -10 25 -5 0"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <circle
            cx="-5"
            cy="0"
            r="3.5"
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth="0.8"
          />
          <circle
            cx="8"
            cy="12"
            r="3"
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth="0.8"
          />
          <circle
            cx="-12"
            cy="22"
            r="3"
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth="0.8"
          />
          <circle
            cx="4"
            cy="36"
            r="2.5"
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth="0.8"
          />
        </g>

        {/* Handwritten Note on Right */}
        <g transform="rotate(8 410 280)" filter={`url(#${id}-card-shadow)`}>
          <rect
            x="355"
            y="255"
            width="105"
            height="62"
            rx="4"
            fill="#ffffff"
            stroke="#fed7aa"
            strokeWidth="0.8"
          />
          <text
            x="407"
            y="278"
            textAnchor="middle"
            fontFamily="var(--font-display)"
            fontStyle="italic"
            fontSize="8.5"
            fill="#be123c"
          >
            Share more kindness
          </text>
          <text
            x="407"
            y="294"
            textAnchor="middle"
            fontFamily="var(--font-display)"
            fontStyle="italic"
            fontSize="8.5"
            fill="#be123c"
          >
            in the world ♡
          </text>
          <path
            data-journey-ink
            d="M365 304 C 385 308, 425 308, 445 302"
            fill="none"
            stroke="#be123c"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </g>
      </g>
    </svg>
  );
}
