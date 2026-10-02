import { useId } from "react";
import styles from "./audio-player.module.css";

export function RecordTonearm({
  className,
  playing,
}: {
  className?: string;
  playing: boolean;
}) {
  const id = useId();
  const metal = `${id}-metal`;
  const pivot = `${id}-pivot`;
  const shell = `${id}-shell`;

  return (
    <svg
      className={className}
      data-playing={playing}
      viewBox="0 0 100 250"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={metal}
          x1="22"
          y1="0"
          x2="84"
          y2="12"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#653c35" />
          <stop offset="0.22" stopColor="#b67b68" />
          <stop offset="0.4" stopColor="#f0c5ae" />
          <stop offset="0.5" stopColor="#fff5e8" />
          <stop offset="0.62" stopColor="#d9a08a" />
          <stop offset="0.82" stopColor="#8b5147" />
          <stop offset="1" stopColor="#e7b39b" />
        </linearGradient>
        <radialGradient id={pivot} cx="0.32" cy="0.25" r="0.8">
          <stop stopColor="#fff6e6" />
          <stop offset="0.32" stopColor="#e9bea7" />
          <stop offset="0.7" stopColor="#b57c69" />
          <stop offset="1" stopColor="#6d463e" />
        </radialGradient>
        <linearGradient
          id={shell}
          x1="10"
          y1="180"
          x2="36"
          y2="220"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fffaf0" />
          <stop offset="0.45" stopColor="#f4e5cd" />
          <stop offset="1" stopColor="#b89a80" />
        </linearGradient>
      </defs>
      <ellipse cx="75" cy="32" rx="22" ry="23" fill="#4e302b" opacity="0.22" />
      <circle cx="74" cy="29" r="21" fill={`url(#${metal})`} stroke="#986b5c" />
      <circle
        cx="74"
        cy="29"
        r="18"
        fill={`url(#${pivot})`}
        stroke="#ffe5d0"
        strokeWidth="1.5"
      />
      <circle cx="74" cy="29" r="13" stroke="#71483d" strokeOpacity="0.5" />
      <g className={styles.tonearmMoving}>
        <g transform="rotate(-9 74 29)">
          <rect
            x="65"
            y="6"
            width="18"
            height="25"
            rx="4"
            fill={`url(#${metal})`}
            stroke="#9c6b59"
          />
          <path
            d="M68 9v13M71 8v14M77 8v14M80 9v13"
            stroke="#fff0dc"
            strokeOpacity="0.5"
          />
        </g>
        <path
          d="M76 32C91 99 67 156 31 194"
          stroke="#4b2b28"
          strokeOpacity="0.25"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <path
          d="M74 29C89 96 65 154 30 192"
          stroke="#70483c"
          strokeWidth="11"
          strokeLinecap="round"
        />
        <path
          d="M74 29C89 96 65 154 30 192"
          stroke={`url(#${metal})`}
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M72 30C86 95 62 151 28 189"
          stroke="#fff1dc"
          strokeOpacity="0.8"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle
          cx="74"
          cy="29"
          r="9"
          fill={`url(#${pivot})`}
          stroke="#fce0c9"
        />
        <circle cx="74" cy="29" r="3" fill="#774a3f" stroke="#ffe8d2" />
        <path d="m72 29 4 0" stroke="#d9b29a" strokeWidth="1.2" />
        <g transform="rotate(35 22 203)">
          <rect
            x="14"
            y="176"
            width="15"
            height="16"
            rx="3"
            fill={`url(#${metal})`}
            stroke="#91634f"
          />
          <path d="M17 221v10h9v-10" fill="#493632" stroke="#b38b74" />
          <path d="M21 229v6" stroke="#d4c4b1" strokeWidth="1.5" />
          <rect
            x="9"
            y="184"
            width="26"
            height="39"
            rx="4"
            fill={`url(#${shell})`}
            stroke="#a7856d"
          />
          <path
            d="M12 219v-31h20"
            stroke="#fffdf5"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M16 191h12M16 195h12"
            stroke="#bca18b"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="14" cy="211" r="1.5" fill="#8a6b59" />
          <circle cx="30" cy="211" r="1.5" fill="#8a6b59" />
          <path
            d="M22 215s-7-4.5-7-8a3.5 3.5 0 0 1 7-1 3.5 3.5 0 0 1 7 1c0 3.5-7 8-7 8Z"
            fill="#ad3b59"
          />
          <path
            d="M31 202h12v9"
            stroke="#b18870"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      </g>
    </svg>
  );
}
