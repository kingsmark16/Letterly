import { useId } from "react";

export function EnvelopeArtwork({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  const id = useId();
  return (
    <svg
      className={className}
      viewBox="0 0 600 340"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={`${id}-base`}
          x1="50"
          y1="50"
          x2="510"
          y2="340"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--scene-envelope-light)" />
          <stop offset="0.5" stopColor="var(--scene-envelope)" />
          <stop offset="1" stopColor="var(--scene-envelope-dark)" />
        </linearGradient>
        <linearGradient
          id={`${id}-left`}
          x1="12"
          y1="70"
          x2="280"
          y2="290"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--scene-envelope-light)" />
          <stop offset="0.55" stopColor="var(--scene-envelope)" />
          <stop offset="1" stopColor="var(--scene-envelope-dark)" />
        </linearGradient>
        <linearGradient
          id={`${id}-right`}
          x1="590"
          y1="50"
          x2="340"
          y2="300"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--scene-envelope)" />
          <stop offset="1" stopColor="var(--scene-envelope-shadow)" />
        </linearGradient>
        <linearGradient
          id={`${id}-front`}
          x1="300"
          y1="150"
          x2="300"
          y2="340"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--scene-envelope-highlight)" />
          <stop offset="0.12" stopColor="var(--scene-envelope-light)" />
          <stop offset="1" stopColor="var(--scene-envelope)" />
        </linearGradient>
        <linearGradient
          id={`${id}-edge`}
          x1="12"
          y1="160"
          x2="588"
          y2="320"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--scene-foil)" stopOpacity="0.6" />
          <stop offset="0.4" stopColor="var(--scene-foil)" stopOpacity="0.12" />
          <stop offset="1" stopColor="var(--scene-foil)" stopOpacity="0.5" />
        </linearGradient>
        <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.72"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.055" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" mode="soft-light" />
        </filter>
      </defs>
      <g filter={`url(#${id}-grain)`}>
        <path
          d="M12 48 300 214 588 48V323a5 5 0 0 1-5 5H17a5 5 0 0 1-5-5Z"
          fill={`url(#${id}-base)`}
        />
        <path d="M12 48 302 213 12 324Z" fill={`url(#${id}-left)`} />
        <path d="M588 48 298 213 588 324Z" fill={`url(#${id}-right)`} />
        <path
          d="m14 324 260-169q26-18 52 0l260 169q-1 4-5 4H19q-4 0-5-4Z"
          fill={`url(#${id}-front)`}
        />
      </g>
      <path
        d="m13 49 270 155m304-155L317 204"
        stroke="var(--scene-envelope-shadow)"
        strokeOpacity="0.5"
        strokeWidth="2"
      />
      <path
        d="m14 323 260-169q26-18 52 0l260 169"
        stroke={`url(#${id}-edge)`}
        strokeWidth="1.5"
      />
      <path
        d="M22 321h556"
        stroke="var(--scene-envelope-shadow)"
        strokeOpacity="0.35"
      />
      <path
        d="m28 70 243 139m300-139L330 209"
        stroke="var(--scene-foil)"
        strokeOpacity="0.15"
        strokeWidth="0.8"
      />
    </svg>
  );
}

export function WaxSeal({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  const id = useId();
  const edge =
    "M50 5C58 1 64 8 71 8S80 13 83 20 94 27 93 37 100 48 95 57 96 71 87 77 82 89 71 90 59 99 50 94 38 98 30 91 18 90 15 80 4 73 7 62 0 49 6 40 5 27 14 22 17 10 29 11 39 1 50 5Z";
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      data-wax-seal
    >
      <defs>
        <radialGradient id={`${id}-wax`} cx="0.3" cy="0.2" r="0.85">
          <stop stopColor="var(--scene-seal-light)" />
          <stop offset="0.46" stopColor="var(--scene-seal)" />
          <stop offset="1" stopColor="var(--scene-seal-dark)" />
        </radialGradient>
        <linearGradient
          id={`${id}-rim`}
          x1="20"
          y1="12"
          x2="79"
          y2="87"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--scene-seal-highlight)" />
          <stop offset="0.4" stopColor="var(--scene-seal)" />
          <stop offset="1" stopColor="var(--scene-seal-dark)" />
        </linearGradient>
      </defs>
      <path
        d={edge}
        fill={`url(#${id}-wax)`}
        stroke="var(--scene-seal-dark)"
        strokeWidth="1.5"
      />
      <circle
        cx="50"
        cy="50"
        r="34"
        fill="none"
        stroke={`url(#${id}-rim)`}
        strokeWidth="4"
      />
      <circle
        cx="50"
        cy="50"
        r="29"
        fill="none"
        stroke="var(--scene-seal-dark)"
        strokeOpacity="0.6"
      />
      <path
        d="M50 67S32 55 32 44a10 10 0 0 1 18-6 10 10 0 0 1 18 6c0 11-18 23-18 23Z"
        stroke="var(--scene-seal-dark)"
        strokeWidth="3"
        transform="translate(0 1.5)"
      />
      <path
        d="M50 67S32 55 32 44a10 10 0 0 1 18-6 10 10 0 0 1 18 6c0 11-18 23-18 23Z"
        stroke="var(--scene-seal-highlight)"
        strokeOpacity="0.8"
        strokeWidth="1.4"
      />
      <path
        d="M22 36a32 32 0 0 1 27-18M10 37l2-8M76 78l7-6"
        stroke="var(--scene-seal-highlight)"
        strokeOpacity="0.45"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
