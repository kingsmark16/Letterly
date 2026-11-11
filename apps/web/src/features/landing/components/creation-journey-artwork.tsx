import { useId } from "react";
import { EnvelopeArtwork } from "./envelope-artwork";
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

        {/* Heavyweight Luxury Cotton Paper */}
        <linearGradient
          id={`${id}-paper-card`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f8fafc" />
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

        {/* Active Pill Accent Gradient */}
        <linearGradient
          id={`${id}-pill-active`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#be123c" />
        </linearGradient>

        {/* Romantic Transmission Beam */}
        <linearGradient id={`${id}-beam`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#be123c" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#e11d48" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#be123c" stopOpacity="0.2" />
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
      {/* SCENE 0: Find your feeling.                                               */}
      {/* ========================================================================= */}
      <g data-journey-scene="0" className={styles.sceneLayer}>
        {/* Card 1: Background Card (tilted -8° around 170 200) */}
        <g transform="rotate(-8 170 200)" filter={`url(#${id}-card-shadow)`}>
          <rect
            x="76"
            y="74"
            width="186"
            height="258"
            rx="8"
            fill={`url(#${id}-paper-card)`}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          {/* Inner Foil Border */}
          <rect
            x="85"
            y="83"
            width="168"
            height="240"
            rx="4"
            fill="none"
            stroke="var(--scene-foil)"
            strokeWidth="0.8"
            strokeOpacity="0.4"
          />
          <rect
            x="88"
            y="86"
            width="162"
            height="234"
            rx="2"
            fill="none"
            stroke="var(--scene-foil)"
            strokeWidth="0.4"
            strokeOpacity="0.25"
          />

          {/* Letterly Vintage Monogram Stamp */}
          <g transform="translate(169 112)">
            <circle
              r="12"
              fill="#fff1f2"
              stroke="var(--scene-foil)"
              strokeWidth="0.8"
              strokeDasharray="1.5 2"
            />
            <text
              textAnchor="middle"
              y="4"
              fontSize="10"
              fontFamily="var(--font-display)"
              fontWeight="600"
              fill="var(--scene-foil)"
            >
              L
            </text>
          </g>

          {/* Folded Presentation Envelope Graphic */}
          <g transform="translate(97 142)">
            <rect
              width="144"
              height="96"
              rx="4"
              fill="#faeaf1"
              stroke="#f43f5e"
              strokeWidth="0.75"
              strokeOpacity="0.3"
            />
            <path
              d="M0 0 L72 52 L144 0"
              fill="none"
              stroke="var(--scene-foil)"
              strokeWidth="1"
              strokeOpacity="0.4"
            />
            <path
              d="M0 96 L52 42 M144 96 L92 42"
              fill="none"
              stroke="var(--scene-foil)"
              strokeWidth="0.75"
              strokeOpacity="0.25"
            />
            {/* Wax seal impression */}
            <circle cx="72" cy="52" r="8" fill={`url(#${id}-ruby-gem)`} />
            <path
              d="M72 56 C70 54 67 52 67 50 A3 3 0 0 1 72 48 A3 3 0 0 1 77 50 C77 52 74 54 72 56 Z"
              fill="#ffffff"
              fillOpacity="0.9"
            />
          </g>

          {/* Elegant Stationery Content Lines */}
          <g
            fill="none"
            stroke="#94a3b8"
            strokeLinecap="round"
            strokeOpacity="0.6"
          >
            <path d="M104 262 h130" strokeWidth="2.5" />
            <path d="M104 278 h96" strokeWidth="2" strokeOpacity="0.4" />
            <path d="M104 292 h112" strokeWidth="1.5" strokeOpacity="0.3" />
          </g>
        </g>

        {/* Card 2: Foreground Card (tilted +7° around 305 200) */}
        <g transform="rotate(7 305 200)" filter={`url(#${id}-paper-shadow)`}>
          <rect
            x="210"
            y="66"
            width="190"
            height="268"
            rx="10"
            fill={`url(#${id}-paper-card)`}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          {/* Double Embossed Frame */}
          <rect
            x="219"
            y="75"
            width="172"
            height="250"
            rx="6"
            fill="none"
            stroke="var(--scene-foil)"
            strokeWidth="0.8"
            strokeOpacity="0.45"
          />
          <rect
            x="222"
            y="78"
            width="166"
            height="244"
            rx="4"
            fill="none"
            stroke="var(--scene-foil)"
            strokeWidth="0.4"
            strokeOpacity="0.25"
          />

          {/* Vintage Postage Stamp at top right */}
          <g transform="translate(356 86)">
            <rect
              width="24"
              height="30"
              rx="2"
              fill="#fff1f2"
              stroke="var(--scene-foil)"
              strokeWidth="0.75"
              strokeDasharray="1.5 2"
            />
            <path
              d="M12 19 C8 15 5 12 5 9 A3.5 3.5 0 0 1 12 7 A3.5 3.5 0 0 1 19 9 C19 12 16 15 12 19 Z"
              fill={`url(#${id}-ruby-gem)`}
            />
          </g>

          {/* Card Header Typography */}
          <text
            x="230"
            y="102"
            fontSize="6.5"
            fontFamily="sans-serif"
            letterSpacing="0.8"
            fontWeight="600"
            fill="#94a3b8"
          >
            A LETTER, JUST FOR YOU
          </text>
          <text
            x="230"
            y="124"
            fontSize="13"
            fontFamily="var(--font-display)"
            fontWeight="600"
            fill="#0f172a"
          >
            To my favorite person,
          </text>

          {/* 3D Lustrous Ruby Heart Emblem */}
          <g transform="translate(305 168)">
            <circle r="26" fill="#ffe4e6" fillOpacity="0.6" />
            <path
              d="M0 18 C-18 6 -24 -6 -24 -15 A12 12 0 0 1 0 -13 A12 12 0 0 1 24 -15 C24 -6 18 6 0 18 Z"
              fill={`url(#${id}-ruby-gem)`}
              filter={`url(#${id}-seal-shadow)`}
            />
            {/* Specular Curved Highlight */}
            <path
              d="M-14 -16 A6 6 0 0 1 -4 -13"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeOpacity="0.75"
            />
          </g>

          {/* Romantic Excerpt Lines */}
          <g
            fill="none"
            stroke="#64748b"
            strokeLinecap="round"
            strokeOpacity="0.5"
          >
            <path d="M230 214 h144" strokeWidth="2" />
            <path d="M230 226 h116" strokeWidth="2" strokeOpacity="0.4" />
          </g>

          {/* Realistic Category Selection Pills */}
          <g transform="translate(230 254)">
            {/* Active Pill: Confession */}
            <rect
              width="80"
              height="26"
              rx="13"
              fill={`url(#${id}-pill-active)`}
            />
            <path
              d="M10 13 L14 17 L20 10"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <text
              x="25"
              y="17"
              fontSize="8"
              fontFamily="sans-serif"
              fontWeight="600"
              fill="#ffffff"
              letterSpacing="0.4"
            >
              Confession
            </text>

            {/* Unselected Pill: Birthday */}
            <rect
              x="86"
              width="58"
              height="26"
              rx="13"
              fill="#ffffff"
              stroke="#e2e8f0"
              strokeWidth="1.2"
            />
            <text
              x="97"
              y="17"
              fontSize="8"
              fontFamily="sans-serif"
              fontWeight="500"
              fill="#64748b"
              letterSpacing="0.4"
            >
              Birthday
            </text>
          </g>

          {/* Bottom Flourish */}
          <path
            d="M285 304 C295 300 315 300 325 304"
            fill="none"
            stroke="var(--scene-foil)"
            strokeWidth="0.8"
            strokeOpacity="0.4"
          />
        </g>
      </g>

      {/* ========================================================================= */}
      {/* SCENE 1: Make it yours.                                                   */}
      {/* ========================================================================= */}
      <g data-journey-scene="1" className={styles.sceneLayer}>
        {/* Luxury Stationery Letterhead (tilted -4° around 220 200) */}
        <g transform="rotate(-4 220 200)" filter={`url(#${id}-paper-shadow)`}>
          <rect
            x="94"
            y="48"
            width="262"
            height="308"
            rx="8"
            fill={`url(#${id}-paper-card)`}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          {/* Delicate Double Border */}
          <rect
            x="104"
            y="58"
            width="242"
            height="288"
            rx="5"
            fill="none"
            stroke="var(--scene-foil)"
            strokeWidth="0.6"
            strokeOpacity="0.4"
          />
          <rect
            x="107"
            y="61"
            width="236"
            height="282"
            rx="3"
            fill="none"
            stroke="var(--scene-foil)"
            strokeWidth="0.3"
            strokeOpacity="0.2"
          />

          {/* Vintage Postal Airmail Stamp */}
          <g transform="translate(296 72)">
            <circle
              r="18"
              fill="none"
              stroke="var(--scene-foil)"
              strokeWidth="0.8"
              strokeDasharray="2 2"
              strokeOpacity="0.5"
            />
            <text
              textAnchor="middle"
              y="-2"
              fontSize="5"
              fontFamily="sans-serif"
              letterSpacing="1"
              fill="var(--scene-foil)"
              fillOpacity="0.7"
            >
              LETTERLY
            </text>
            <text
              textAnchor="middle"
              y="6"
              fontSize="6.5"
              fontFamily="sans-serif"
              fontWeight="700"
              fill="var(--scene-foil)"
              fillOpacity="0.8"
            >
              PAR AVION
            </text>
            <text
              textAnchor="middle"
              y="13"
              fontSize="5"
              fontFamily="sans-serif"
              letterSpacing="0.5"
              fill="var(--scene-foil)"
              fillOpacity="0.6"
            >
              2026
            </text>
          </g>

          {/* Botanical Corner Watermark */}
          <g
            transform="translate(116 72)"
            stroke="var(--scene-foil)"
            strokeWidth="0.75"
            fill="none"
            strokeOpacity="0.35"
          >
            <path d="M0 24 C4 16 12 12 24 10 M8 16 C12 12 18 10 24 10 M12 20 C16 16 20 14 24 10" />
            <circle
              cx="26"
              cy="9"
              r="2"
              fill="var(--scene-foil)"
              fillOpacity="0.25"
            />
          </g>

          {/* Letter Salutation */}
          <text
            x="124"
            y="116"
            fontSize="18"
            fontFamily="var(--font-display)"
            fontStyle="italic"
            fontWeight="600"
            fill="#0f172a"
          >
            Dear You,
          </text>

          {/* Calligraphic Handwriting Lines - Animated by GSAP via [data-journey-ink] */}
          <g
            stroke="var(--journey-ink)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
            fill="none"
          >
            <path
              data-journey-ink
              d="M124 148 C142 142 160 152 178 146 C196 140 214 150 232 144 C248 138 266 148 284 142 C298 138 312 146 326 142"
            />
            <path
              data-journey-ink
              d="M124 176 C144 170 164 182 184 174 C204 166 226 180 246 172 C264 166 284 178 304 170 C316 166 324 172 334 168"
            />
            <path
              data-journey-ink
              d="M124 204 C140 198 158 210 176 202 C196 194 216 208 236 200 C254 194 272 206 290 198 C306 192 320 202 330 196"
            />
            <path
              data-journey-ink
              d="M124 232 C146 226 168 238 190 230 C210 224 230 236 250 228 C268 222 284 232 300 226"
            />
            <path
              data-journey-ink
              d="M124 260 C148 252 172 266 196 258 C216 250 232 262 248 256"
            />
          </g>

          {/* Signature & Flourish */}
          <g transform="translate(200 294)">
            <path
              d="M0 12 C18 -2 36 22 56 6 C72 -6 88 16 104 2 M60 14 C76 8 92 12 108 8"
              fill="none"
              stroke="var(--scene-foil)"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeOpacity="0.6"
            />
            <circle
              cx="112"
              cy="7"
              r="1.5"
              fill="var(--scene-foil)"
              fillOpacity="0.8"
            />
          </g>
        </g>

        {/* 18K Solid Gold Fountain Pen Resting Diagonally (tilted 32° around 350 210) */}
        <g transform="rotate(32 350 210)">
          {/* Pen Cast Shadow */}
          <rect
            x="340"
            y="86"
            width="16"
            height="196"
            rx="8"
            fill="#0f172a"
            fillOpacity="0.18"
            filter={`url(#${id}-seal-shadow)`}
            transform="translate(6 6)"
          />

          {/* Pen Barrel Body (Burgundy Lacquer) */}
          <rect
            x="342"
            y="80"
            width="16"
            height="152"
            rx="6"
            fill={`url(#${id}-pen-body)`}
          />
          {/* Specular Highlight along barrel */}
          <line
            x1="346"
            y1="84"
            x2="346"
            y2="228"
            stroke="#ffffff"
            strokeWidth="1.2"
            strokeOpacity="0.45"
            strokeLinecap="round"
          />

          {/* Gold Center Band */}
          <rect
            x="341"
            y="160"
            width="18"
            height="5"
            rx="1"
            fill={`url(#${id}-gold-nib)`}
            stroke="#a16207"
            strokeWidth="0.5"
          />
          {/* Gold Grip Junction Ring */}
          <rect
            x="341"
            y="230"
            width="18"
            height="6"
            rx="1"
            fill={`url(#${id}-gold-nib)`}
            stroke="#a16207"
            strokeWidth="0.5"
          />

          {/* Grip Section */}
          <path
            d="M343 236 L345 264 L355 264 L357 236 Z"
            fill="#0f172a"
            stroke="#1e293b"
            strokeWidth="0.5"
          />
          {/* Gold Nib Collar Ring */}
          <rect
            x="344"
            y="264"
            width="12"
            height="3"
            rx="0.5"
            fill={`url(#${id}-gold-nib)`}
          />

          {/* 18K Solid Gold Fountain Pen Nib */}
          <g transform="translate(350 267)">
            <path
              d="M-6 0 C-6 10 -4 20 0 32 C4 20 6 10 6 0 Z"
              fill={`url(#${id}-gold-nib)`}
              stroke="#a16207"
              strokeWidth="0.6"
            />
            {/* Two-Tone Rhodium Inlay */}
            <path
              d="M-3.5 4 C-3.5 12 -2.5 18 0 26 C2.5 18 3.5 12 3.5 4 Z"
              fill="#f8fafc"
              fillOpacity="0.75"
            />
            {/* Breather Hole & Nib Slit */}
            <circle cx="0" cy="14" r="1.4" fill="#4c0519" />
            <line
              x1="0"
              y1="15"
              x2="0"
              y2="32"
              stroke="#4c0519"
              strokeWidth="0.75"
            />
            <path
              d="M-4 8 C-2 10 2 10 4 8"
              fill="none"
              stroke="#a16207"
              strokeWidth="0.5"
            />
            {/* Wet Ink Droplet Glint at Nib Tip */}
            <circle cx="0" cy="32" r="2.2" fill="var(--journey-ink)" />
            <circle cx="0.5" cy="31.5" r="0.8" fill="#ffffff" />
          </g>
        </g>
      </g>

      {/* ========================================================================= */}
      {/* SCENE 2: Take a little peek.                                              */}
      {/* ========================================================================= */}
      <g data-journey-scene="2" className={styles.sceneLayer}>
        {/* Creator's Desktop Draft in Background (tilted -8° around 150 200) */}
        <g
          transform="rotate(-8 150 200)"
          filter={`url(#${id}-card-shadow)`}
          opacity="0.85"
        >
          <rect
            x="76"
            y="80"
            width="168"
            height="248"
            rx="6"
            fill={`url(#${id}-paper-card)`}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          <rect
            x="84"
            y="88"
            width="152"
            height="232"
            rx="4"
            fill="none"
            stroke="var(--scene-foil)"
            strokeWidth="0.5"
            strokeOpacity="0.3"
          />
          {/* Draft lines and notes */}
          <g
            fill="none"
            stroke="#94a3b8"
            strokeLinecap="round"
            strokeOpacity="0.6"
          >
            <path d="M96 116 h112" strokeWidth="3" />
            <path d="M96 132 h92" strokeWidth="2" strokeOpacity="0.4" />
            <path d="M96 148 h120" strokeWidth="2" strokeOpacity="0.5" />
            <path d="M96 220 h88" strokeWidth="2.5" />
            <path d="M96 236 h108" strokeWidth="2" strokeOpacity="0.4" />
          </g>
          {/* Heart seal on draft */}
          <g transform="translate(160 184)">
            <circle
              r="14"
              fill="#fff1f2"
              stroke="var(--scene-foil)"
              strokeWidth="0.8"
              strokeDasharray="1.5 2"
            />
            <path
              d="M0 6 C-6 2 -8 -2 -8 -5 A4 4 0 0 1 0 -4 A4 4 0 0 1 8 -5 C8 -2 6 2 0 6 Z"
              fill={`url(#${id}-ruby-gem)`}
            />
          </g>
        </g>

        {/* Sleek Modern Smartphone Mockup */}
        <g filter={`url(#${id}-phone-shadow)`}>
          {/* Titanium Outer Frame */}
          <rect
            x="200"
            y="38"
            width="188"
            height="332"
            rx="32"
            fill={`url(#${id}-phone-frame)`}
            stroke="#64748b"
            strokeWidth="1.2"
          />
          {/* Inner Bezel */}
          <rect
            x="204"
            y="42"
            width="180"
            height="324"
            rx="28"
            fill="#0f172a"
          />
          {/* OLED Screen */}
          <rect
            x="208"
            y="46"
            width="172"
            height="316"
            rx="24"
            fill="#09090b"
          />

          {/* Dynamic Island Pill */}
          <g transform="translate(294 56)">
            <rect x="-32" y="0" width="64" height="14" rx="7" fill="#000000" />
            <circle cx="16" cy="7" r="3.5" fill="#18181b" />
            <circle cx="16" cy="7" r="1.5" fill="#0284c7" fillOpacity="0.7" />
            <circle cx="-16" cy="7" r="2" fill="#18181b" />
          </g>

          {/* Status Bar */}
          <text
            x="226"
            y="66"
            fontSize="8"
            fontFamily="sans-serif"
            fontWeight="600"
            fill="#f8fafc"
          >
            9:41
          </text>
          <g transform="translate(356 60)">
            <rect
              width="14"
              height="7"
              rx="2"
              fill="none"
              stroke="#f8fafc"
              strokeWidth="0.8"
            />
            <rect x="1.5" y="1.5" width="8" height="4" rx="1" fill="#22c55e" />
            <path
              d="M15 2.5 v2"
              stroke="#f8fafc"
              strokeWidth="0.8"
              strokeLinecap="round"
            />
          </g>

          {/* Live Letterly Header */}
          <g transform="translate(294 92)">
            <text
              textAnchor="middle"
              fontSize="9"
              fontFamily="var(--font-display)"
              fontWeight="600"
              fill="#ffffff"
              letterSpacing="0.5"
            >
              Letterly Preview
            </text>
            <line
              x1="-30"
              y1="12"
              x2="30"
              y2="12"
              stroke="#f43f5e"
              strokeWidth="1"
              strokeOpacity="0.4"
            />
          </g>

          {/* Mini Letter Card Sliding from Envelope */}
          <g transform="translate(294 172)">
            <rect
              x="-56"
              y="-54"
              width="112"
              height="92"
              rx="4"
              fill="#ffffff"
              stroke="#e2e8f0"
              strokeWidth="0.75"
            />
            <rect
              x="-50"
              y="-48"
              width="100"
              height="80"
              rx="2"
              fill="none"
              stroke="var(--scene-foil)"
              strokeWidth="0.5"
              strokeOpacity="0.3"
            />
            <text
              x="-42"
              y="-32"
              fontSize="7"
              fontFamily="var(--font-display)"
              fontWeight="600"
              fill="#0f172a"
            >
              Dear Someone,
            </text>
            <g
              fill="none"
              stroke="#be123c"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeOpacity="0.7"
            >
              <path d="M-42 -18 h84" />
              <path d="M-42 -6 h68" />
              <path d="M-42 6 h76" />
            </g>
          </g>

          {/* Mini Envelope in Phone Screen */}
          <g transform="translate(230 186)">
            <svg width="128" height="72" viewBox="0 0 600 340">
              <EnvelopeArtwork />
            </svg>
            <circle
              cx="64"
              cy="46"
              r="10"
              fill={`url(#${id}-ruby-gem)`}
              filter={`url(#${id}-seal-shadow)`}
            />
            <path
              d="M64 50 C62 48 59 46 59 44 A2.5 2.5 0 0 1 64 42 A2.5 2.5 0 0 1 69 44 C69 46 66 48 64 50 Z"
              fill="#ffffff"
              fillOpacity="0.9"
            />
          </g>

          {/* Romantic Audio Player Widget Chip */}
          <g transform="translate(224 274)">
            <rect
              width="140"
              height="32"
              rx="16"
              fill="#1e1b2e"
              stroke="#f43f5e"
              strokeWidth="0.8"
              strokeOpacity="0.5"
            />
            <circle cx="16" cy="16" r="10" fill={`url(#${id}-pill-active)`} />
            <polygon points="14,12 20,16 14,20" fill="#ffffff" />
            <text
              x="32"
              y="15"
              fontSize="7.5"
              fontFamily="sans-serif"
              fontWeight="600"
              fill="#ffffff"
            >
              Clair de Lune
            </text>
            <text
              x="32"
              y="24"
              fontSize="6"
              fontFamily="sans-serif"
              fill="#94a3b8"
            >
              Letterly Music • 3:42
            </text>
            <g transform="translate(108 16)" fill="#f43f5e">
              <rect x="0" y="-6" width="2" height="12" rx="1" />
              <rect x="4" y="-9" width="2" height="18" rx="1" fill="#fb7185" />
              <rect x="8" y="-4" width="2" height="8" rx="1" />
              <rect x="12" y="-7" width="2" height="14" rx="1" fill="#fb7185" />
              <rect x="16" y="-3" width="2" height="6" rx="1" />
            </g>
          </g>

          {/* Interactive "TAP TO OPEN" Button */}
          <g transform="translate(254 320)">
            <rect
              width="80"
              height="20"
              rx="10"
              fill={`url(#${id}-pill-active)`}
            />
            <text
              x="40"
              y="13"
              textAnchor="middle"
              fontSize="7.5"
              fontFamily="sans-serif"
              fontWeight="600"
              fill="#ffffff"
              letterSpacing="0.6"
            >
              TAP TO OPEN
            </text>
          </g>

          {/* Home Indicator */}
          <rect
            x="264"
            y="352"
            width="60"
            height="3"
            rx="1.5"
            fill="#f8fafc"
            fillOpacity="0.6"
          />

          {/* Specular Glass Screen Sheen */}
          <path
            d="M208 46 L380 46 L208 260 Z"
            fill={`url(#${id}-glass-gleam)`}
            pointerEvents="none"
          />
        </g>
      </g>

      {/* ========================================================================= */}
      {/* SCENE 3: Send a little love.                                              */}
      {/* ========================================================================= */}
      <g data-journey-scene="3" className={styles.sceneLayer}>
        {/* Presentation Envelope & Stamped 3D Wax Seal (tilted -5° around 240 210) */}
        <g transform="rotate(-5 240 210)" filter={`url(#${id}-paper-shadow)`}>
          {/* Golden Letter Sheet Peeking out */}
          <g transform="translate(136 82)">
            <rect
              x="0"
              y="0"
              width="208"
              height="160"
              rx="6"
              fill="#ffffff"
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <rect
              x="8"
              y="8"
              width="192"
              height="144"
              rx="4"
              fill="none"
              stroke="var(--scene-foil)"
              strokeWidth="0.6"
              strokeOpacity="0.4"
            />
            {/* Letter Header Emblem */}
            <g transform="translate(104 36)">
              <path
                d="M0 8 C-8 2 -11 -4 -11 -8 A6 6 0 0 1 0 -6 A6 6 0 0 1 11 -8 C11 -4 8 2 0 8 Z"
                fill={`url(#${id}-ruby-gem)`}
              />
            </g>
            {/* Letter Content Lines */}
            <g
              fill="none"
              stroke="#be123c"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeOpacity="0.6"
            >
              <path d="M32 64 h144" />
              <path d="M32 82 h128" />
              <path d="M32 100 h104" />
            </g>
          </g>

          {/* Luxury Presentation Envelope Artwork */}
          <svg x="76" y="160" width="328" height="186" viewBox="0 0 600 340">
            <EnvelopeArtwork />
          </svg>

          {/* 3D Wax Seal with organic melt and stamped heart impression */}
          <g transform="translate(240 246)">
            <circle
              r="28"
              fill="#0f172a"
              fillOpacity="0.18"
              filter={`url(#${id}-seal-shadow)`}
            />
            <path
              d="M0 -26 C7 -28 14 -22 20 -20 C27 -17 30 -9 28 -2 C29 6 30 13 25 19 C20 25 12 28 4 28 C-4 28 -12 26 -18 21 C-25 15 -28 8 -27 0 C-29 -8 -25 -16 -19 -20 C-13 -23 -6 -28 0 -26 Z"
              fill={`url(#${id}-wax-base)`}
              stroke="#4c0519"
              strokeWidth="1.2"
            />
            <circle
              r="19"
              fill="none"
              stroke="#fb7185"
              strokeWidth="2.5"
              strokeOpacity="0.85"
            />
            <circle
              r="17"
              fill="none"
              stroke="#4c0519"
              strokeWidth="1"
              strokeOpacity="0.6"
            />
            <circle r="14" fill={`url(#${id}-ruby-gem)`} />
            <path
              d="M0 7 C-7 2 -10 -3 -10 -6 A5 5 0 0 1 0 -5 A5 5 0 0 1 10 -6 C10 -3 7 2 0 7 Z"
              fill="#ffffff"
              fillOpacity="0.9"
              stroke="#4c0519"
              strokeWidth="0.8"
            />
            <path
              d="M-14 -12 A18 18 0 0 1 12 -14"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeOpacity="0.7"
            />
          </g>
        </g>

        {/* Radiant Orbital Transmission Path */}
        <path
          d="M60 186 C60 50 420 50 420 186"
          fill="none"
          stroke={`url(#${id}-beam)`}
          strokeWidth="2.5"
          strokeDasharray="4 6"
          strokeLinecap="round"
        />

        {/* Sender Node: "YOU" */}
        <g transform="translate(60 186)">
          <circle r="20" fill="#fff1f2" fillOpacity="0.85" />
          <circle
            r="13"
            fill="#ffffff"
            stroke="var(--scene-foil)"
            strokeWidth="1.5"
            filter={`url(#${id}-seal-shadow)`}
          />
          <circle r="5" fill={`url(#${id}-pill-active)`} />
          <text
            textAnchor="middle"
            y="26"
            fontSize="8"
            fontFamily="sans-serif"
            fontWeight="700"
            letterSpacing="1"
            fill="#be123c"
          >
            YOU
          </text>
        </g>

        {/* Recipient Node: "THEM" */}
        <g transform="translate(420 186)">
          <circle r="20" fill="#fff1f2" fillOpacity="0.85" />
          <circle
            r="13"
            fill="#ffffff"
            stroke="var(--scene-foil)"
            strokeWidth="1.5"
            filter={`url(#${id}-seal-shadow)`}
          />
          <path
            d="M0 3.5 C-3.5 1 -5 -1.5 -5 -3.5 A2.5 2.5 0 0 1 0 -2.5 A2.5 2.5 0 0 1 5 -3.5 C5 -1.5 3.5 1 0 3.5 Z"
            fill={`url(#${id}-ruby-gem)`}
          />
          <text
            textAnchor="middle"
            y="26"
            fontSize="8"
            fontFamily="sans-serif"
            fontWeight="700"
            letterSpacing="1"
            fill="#be123c"
          >
            THEM
          </text>
        </g>

        {/* Stardust / Celestial Glints along orbit */}
        <g fill="var(--scene-foil)" opacity="0.8">
          <path d="m140 96 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" />
          <path d="m340 96 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" />
          <path d="m240 62 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" />
        </g>
      </g>
    </svg>
  );
}
