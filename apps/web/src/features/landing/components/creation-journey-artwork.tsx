import { EnvelopeArtwork, WaxSeal } from "./envelope-artwork";
import styles from "./how-letterly-works.module.css";

function Heart({
  x,
  y,
  size = 1,
}: {
  x: number;
  y: number;
  size?: number;
}): React.JSX.Element {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${size})`}
      d="M0 10S-12 3-12-5a6.5 6.5 0 0 1 12-4 6.5 6.5 0 0 1 12 4C12 3 0 10 0 10Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
    />
  );
}

export function CreationJourneyArtwork(): React.JSX.Element {
  return (
    <svg
      className={styles.artwork}
      viewBox="0 0 480 400"
      fill="none"
      aria-hidden="true"
    >
      <ellipse
        cx="240"
        cy="220"
        rx="183"
        ry="150"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.25"
      />
      <path
        d="m74 87 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Zm319 217 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z"
        stroke="currentColor"
        opacity="0.7"
      />
      <g data-journey-scene="0" className={styles.sceneLayer}>
        <g transform="rotate(-10 170 202)" className={styles.paperShadow}>
          <rect
            x="82"
            y="79"
            width="176"
            height="246"
            rx="4"
            fill="var(--journey-paper-dark)"
            stroke="var(--journey-edge)"
          />
          <rect
            x="91"
            y="88"
            width="158"
            height="228"
            rx="2"
            stroke="var(--journey-edge)"
            strokeWidth="0.6"
          />
          <path
            d="M110 120h119M110 253h119m-100 12h81"
            stroke="var(--journey-ink)"
            opacity="0.5"
          />
          <path
            d="M116 154h108v71H116zM116 154l54 42 54-42m-108 71 39-41m69 41-39-41"
            fill="var(--scene-envelope)"
            stroke="var(--scene-foil)"
          />
          <Heart x={170} y={203} size={0.65} />
        </g>
        <g transform="rotate(9 304 202)" className={styles.paperShadow}>
          <rect
            x="215"
            y="74"
            width="178"
            height="254"
            rx="4"
            fill="var(--journey-paper)"
            stroke="var(--journey-edge)"
          />
          <rect
            x="224"
            y="83"
            width="160"
            height="236"
            rx="2"
            stroke="var(--journey-edge)"
            strokeWidth="0.6"
          />
          <Heart x={304} y={151} size={1.8} />
          <path
            d="M247 205h114m-96 13h78"
            stroke="var(--journey-ink)"
            opacity="0.6"
          />
          <rect
            x="246"
            y="256"
            width="51"
            height="27"
            rx="4"
            fill="var(--scene-envelope)"
          />
          <rect
            x="309"
            y="256"
            width="51"
            height="27"
            rx="4"
            stroke="var(--scene-envelope)"
          />
          <path
            d="m262 268 5 5 9-10"
            stroke="var(--journey-paper)"
            strokeWidth="1.5"
          />
        </g>
      </g>
      <g data-journey-scene="1" className={styles.sceneLayer}>
        <g transform="rotate(-5 232 200)" className={styles.paperShadow}>
          <rect
            x="107"
            y="53"
            width="250"
            height="298"
            rx="3"
            fill="var(--journey-paper)"
            stroke="var(--journey-edge)"
          />
          <rect
            x="117"
            y="63"
            width="230"
            height="278"
            stroke="var(--journey-edge)"
            strokeWidth="0.6"
          />
          <Heart x={311} y={97} size={0.7} />
          <path d="M139 112h185" stroke="var(--journey-edge)" />
          <g stroke="var(--journey-ink)" strokeLinecap="round" strokeWidth="2">
            <path data-journey-ink d="M139 153h121" />
            <path data-journey-ink d="M139 181h185m-185 14h151" />
            <path data-journey-ink d="M139 224h176m-176 14h115" />
          </g>
          <path d="M202 295q16-9 30 0t30 0" stroke="var(--journey-edge)" />
        </g>
        <g transform="rotate(27 350 207)" className={styles.paperShadow}>
          <rect
            x="342"
            y="101"
            width="16"
            height="174"
            rx="6"
            fill="var(--scene-foil)"
            stroke="var(--scene-envelope-shadow)"
          />
          <path
            d="m342 270 8 28 8-28"
            fill="var(--journey-paper)"
            stroke="var(--journey-edge)"
          />
          <path d="m347 288 3 10 3-10" fill="var(--journey-ink)" />
          <path
            d="M346 118v131m8-139v44"
            stroke="var(--journey-paper)"
            opacity="0.6"
          />
        </g>
      </g>
      <g data-journey-scene="2" className={styles.sceneLayer}>
        <g transform="rotate(-7 146 204)" opacity="0.65">
          <rect
            x="85"
            y="93"
            width="130"
            height="224"
            rx="3"
            fill="var(--journey-paper-dark)"
            stroke="var(--journey-edge)"
          />
          <path
            d="M106 130h87m-87 18h69m-69 92h83m-83 16h70"
            stroke="var(--journey-ink)"
          />
        </g>
        <g className={styles.paperShadow}>
          <rect
            x="184"
            y="34"
            width="180"
            height="330"
            rx="27"
            fill="var(--scene-envelope-shadow)"
            stroke="var(--scene-foil)"
            strokeWidth="1.5"
          />
          <rect
            x="193"
            y="43"
            width="162"
            height="312"
            rx="20"
            fill="var(--journey-screen)"
            stroke="var(--scene-envelope)"
          />
          <rect
            x="240"
            y="51"
            width="68"
            height="12"
            rx="6"
            fill="var(--scene-envelope-shadow)"
          />
          <Heart x={274} y={111} size={0.7} />
          <rect
            x="225"
            y="144"
            width="98"
            height="106"
            rx="1"
            fill="var(--journey-paper)"
            transform="rotate(-5 274 197)"
          />
          <path
            d="M240 166h65m-65 13h55m-55 20h63"
            stroke="var(--journey-ink)"
            opacity="0.5"
          />
          <svg x="211" y="212" width="126" height="72" viewBox="0 0 600 340">
            <EnvelopeArtwork />
          </svg>
          <path
            d="M238 309h72m-60 12h48"
            stroke="var(--journey-paper-dark)"
            strokeWidth="1.5"
          />
          <rect
            x="250"
            y="342"
            width="48"
            height="3"
            rx="1.5"
            fill="var(--journey-paper-dark)"
          />
        </g>
      </g>
      <g data-journey-scene="3" className={styles.sceneLayer}>
        <path
          d="M73 188q-11-99 108-103m134 4q104-3 97 99"
          stroke="var(--scene-foil)"
          strokeDasharray="2 6"
          opacity="0.65"
        />
        <Heart x={72} y={185} size={0.9} />
        <Heart x={411} y={188} size={0.9} />
        <g transform="rotate(-6 240 208)" className={styles.paperShadow}>
          <rect
            x="137"
            y="91"
            width="205"
            height="164"
            rx="2"
            fill="var(--journey-paper)"
            stroke="var(--journey-edge)"
          />
          <Heart x={240} y={139} size={0.85} />
          <path
            d="M166 173h148m-127 15h106"
            stroke="var(--journey-ink)"
            opacity="0.5"
          />
          <svg x="79" y="169" width="322" height="183" viewBox="0 0 600 340">
            <EnvelopeArtwork />
          </svg>
          <svg x="215" y="238" width="52" height="52" viewBox="0 0 120 120">
            <WaxSeal />
          </svg>
        </g>
      </g>
    </svg>
  );
}
