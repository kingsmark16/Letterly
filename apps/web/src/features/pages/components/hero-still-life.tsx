export function HeroStillLife(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className="hero-still-life"
      fill="none"
      viewBox="0 0 900 560"
    >
      <defs>
        <linearGradient id="ribbon" x1="0" x2="1" y1="0" y2="1">
          <stop stopColor="#7f152d" />
          <stop offset="0.45" stopColor="#d96d78" />
          <stop offset="0.72" stopColor="#9f263c" />
          <stop offset="1" stopColor="#5f1025" />
        </linearGradient>
        <linearGradient id="envelope" x1="0" x2="0.85" y1="0" y2="1">
          <stop stopColor="#f5cfc4" />
          <stop offset="1" stopColor="#dca596" />
        </linearGradient>
        <linearGradient id="envelopeFold" x1="0" x2="1" y1="0" y2="1">
          <stop stopColor="#efc5b9" />
          <stop offset="1" stopColor="#c9877e" />
        </linearGradient>
        <linearGradient id="paper" x1="0" x2="1" y1="0" y2="1">
          <stop stopColor="#fffdf7" />
          <stop offset="1" stopColor="#f1dfd3" />
        </linearGradient>
        <radialGradient id="seal" cx="38%" cy="30%" r="70%">
          <stop stopColor="#b6424f" />
          <stop offset="0.55" stopColor="#801b31" />
          <stop offset="1" stopColor="#4e0b1e" />
        </radialGradient>
        <radialGradient id="rose" cx="42%" cy="36%" r="65%">
          <stop stopColor="#ffd1cc" />
          <stop offset="0.52" stopColor="#dd7880" />
          <stop offset="1" stopColor="#9c3346" />
        </radialGradient>
        <linearGradient id="sunset" x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="#645c77" />
          <stop offset="0.48" stopColor="#e88977" />
          <stop offset="0.72" stopColor="#ffbd81" />
          <stop offset="1" stopColor="#4a2730" />
        </linearGradient>
        <linearGradient id="penBody" x1="0" x2="1">
          <stop stopColor="#210c13" />
          <stop offset="0.45" stopColor="#5c1827" />
          <stop offset="0.7" stopColor="#18070d" />
          <stop offset="1" stopColor="#7c2431" />
        </linearGradient>
        <filter id="softShadow" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="12" floodColor="#5d2b32" floodOpacity="0.18" stdDeviation="10" />
        </filter>
        <filter id="smallShadow" x="-40%" y="-40%" width="180%" height="190%">
          <feDropShadow dx="0" dy="5" floodColor="#4d222a" floodOpacity="0.22" stdDeviation="4" />
        </filter>
        <path id="tinyHeart" d="M0 3.2C0 .9 3-.2 4.5 1.8 6-.2 9 .9 9 3.2 9 6 4.5 8.6 4.5 8.6S0 6 0 3.2Z" />
        <g id="babyFlower">
          <circle cx="0" cy="0" r="4.5" fill="#fffdf3" />
          <circle cx="-4" cy="1" r="3.2" fill="#fff9e9" />
          <circle cx="3" cy="-3" r="3.1" fill="#fffdf5" />
          <circle cx="3.7" cy="3" r="2.9" fill="#fff8e7" />
          <circle cx="0" cy="0" r="1.35" fill="#d7ab63" />
        </g>
      </defs>

      <path
        d="M360 7c75 63 107 15 169 53 47 28 80 46 142 2 48-34 90-28 139 14 28 24 56 31 92 24"
        stroke="url(#ribbon)"
        strokeLinecap="round"
        strokeWidth="31"
      />
      <path
        d="M365 4c74 50 109 7 169 45 49 31 83 40 134 3"
        opacity="0.48"
        stroke="#ffb1ad"
        strokeLinecap="round"
        strokeWidth="6"
      />

      <g opacity="0.95" stroke="#6f7650" strokeLinecap="round">
        <path d="M228 345c45-123 117-193 208-233M249 351c25-105 15-155 5-226M267 356c62-85 119-113 170-126" />
        <path d="M637 379c39-95 72-153 137-214M659 391c52-83 103-115 155-129M627 382c5-89-4-138-26-184" />
      </g>
      <g opacity="0.98">
        <use href="#babyFlower" transform="translate(261 170)" />
        <use href="#babyFlower" transform="translate(289 143) scale(.9)" />
        <use href="#babyFlower" transform="translate(319 131) scale(.8)" />
        <use href="#babyFlower" transform="translate(344 110) scale(1.05)" />
        <use href="#babyFlower" transform="translate(375 117) scale(.85)" />
        <use href="#babyFlower" transform="translate(402 102)" />
        <use href="#babyFlower" transform="translate(245 217) scale(.8)" />
        <use href="#babyFlower" transform="translate(272 202)" />
        <use href="#babyFlower" transform="translate(306 183) scale(.75)" />
        <use href="#babyFlower" transform="translate(227 274)" />
        <use href="#babyFlower" transform="translate(263 260) scale(.85)" />
        <use href="#babyFlower" transform="translate(703 239)" />
        <use href="#babyFlower" transform="translate(735 218) scale(.8)" />
        <use href="#babyFlower" transform="translate(766 193)" />
        <use href="#babyFlower" transform="translate(789 230) scale(.75)" />
        <use href="#babyFlower" transform="translate(679 285) scale(.9)" />
        <use href="#babyFlower" transform="translate(712 301)" />
        <use href="#babyFlower" transform="translate(749 283) scale(.8)" />
        <use href="#babyFlower" transform="translate(648 335)" />
        <use href="#babyFlower" transform="translate(685 350) scale(.75)" />
      </g>

      <g filter="url(#smallShadow)" transform="translate(85 247) rotate(-8)">
        <rect width="214" height="235" rx="3" fill="#fff9ef" />
        <rect x="17" y="18" width="180" height="143" fill="url(#sunset)" />
        <circle cx="148" cy="96" r="16" fill="#ffd492" opacity="0.9" />
        <path d="M17 133c29-32 51-20 76-39 20-15 38-6 56 8 14 11 29 8 48-5v64H17Z" fill="#2e1c2b" opacity="0.78" />
        <path d="M17 147c34-16 57-9 82-18 37-14 63 3 98-15v47H17Z" fill="#3a202c" />
        <text x="32" y="196" fill="#4b3033" fontFamily="cursive" fontSize="22">Better Together</text>
        <path d="M165 187c0-10 13-14 18-5 6-9 18-5 18 5 0 11-18 22-18 22s-18-11-18-22Z" stroke="#6f3b42" strokeWidth="2.5" />
      </g>

      <g filter="url(#softShadow)">
        <path d="M250 234 473 108 694 234v258H250Z" fill="#d99e94" />
        <rect x="315" y="117" width="326" height="260" rx="4" fill="url(#paper)" transform="rotate(-3 315 117)" />
        <text x="378" y="204" fill="#3f3436" fontFamily="cursive" fontSize="28" transform="rotate(-3 378 204)">Good people</text>
        <text x="355" y="245" fill="#3f3436" fontFamily="cursive" fontSize="27" transform="rotate(-3 355 245)">make a brighter world</text>
        <path d="M466 277c0-14 17-18 24-7 7-11 24-7 24 7 0 15-24 29-24 29s-24-14-24-29Z" stroke="#55464a" strokeWidth="3" />
        <rect x="250" y="234" width="444" height="258" rx="5" fill="url(#envelope)" />
        <path d="m250 234 221 163 223-163v258H250Z" fill="url(#envelopeFold)" />
        <path d="m250 492 180-161c23-20 58-20 81 0l183 161H250Z" fill="#edb9ac" />
        <path d="m250 234 178 140M694 234 516 374" stroke="#c9877e" strokeWidth="2" opacity="0.65" />
      </g>

      <g filter="url(#smallShadow)" transform="translate(472 397)">
        <circle r="51" fill="#681426" />
        <circle r="43" fill="url(#seal)" stroke="#c35d64" strokeWidth="3" />
        <circle r="34" stroke="#5a1020" strokeWidth="2" />
        <path d="M-16-4c0-14 18-19 26-7 8-12 26-7 26 7 0 17-26 33-26 33S-16 13-16-4Z" stroke="#e39490" strokeWidth="3" />
      </g>

      <g filter="url(#smallShadow)" transform="translate(666 123)">
        <ellipse cx="-43" cy="-15" rx="29" ry="68" fill="#62804d" transform="rotate(-40)" />
        <ellipse cx="43" cy="-22" rx="27" ry="73" fill="#3f673c" transform="rotate(38)" />
        <circle r="72" fill="url(#rose)" />
        <path d="M-55 5c4-48 39-72 74-57 35 16 42 61 7 92-33 29-77 12-81-35Z" stroke="#b64c5c" strokeWidth="8" />
        <path d="M-31-4c5-28 34-42 57-25 25 19 14 53-10 65-25 13-53-10-47-40Z" stroke="#a9364b" strokeWidth="7" />
        <path d="M-10-3c7-14 27-13 34 2 8 17-8 30-23 28-18-3-20-20-11-30Z" stroke="#762039" strokeWidth="6" />
        <circle cx="6" cy="5" r="8" fill="#722036" />
      </g>

      <g filter="url(#smallShadow)" transform="translate(734 230) rotate(8)">
        <path d="M0 0h133l-5 180-128-4Z" fill="#f5e7d8" />
        <path d="m0 0 8 4 9-4 8 4 9-4 8 4 9-4 9 4 10-4 8 4 9-4 9 4 9-4 9 4 10-4 9 4V176l-9-4-9 4-10-4-9 4-9-4-9 4-9-4-9 4-9-4-9 4-8-4-8 4-8-4Z" stroke="#d2ad98" strokeWidth="1.5" />
        <text x="27" y="56" fill="#564448" fontFamily="serif" fontSize="17" letterSpacing="3">SOME</text>
        <text x="24" y="84" fill="#564448" fontFamily="serif" fontSize="17" letterSpacing="3">PEOPLE</text>
        <text x="21" y="112" fill="#564448" fontFamily="serif" fontSize="17" letterSpacing="3">DESERVE</text>
        <text x="31" y="140" fill="#564448" fontFamily="serif" fontSize="17" letterSpacing="3">A LETTER</text>
        <use href="#tinyHeart" fill="none" stroke="#75545a" strokeWidth="1.6" transform="translate(61 148) scale(1.5)" />
      </g>

      <g filter="url(#smallShadow)" transform="translate(730 307) rotate(36)">
        <path d="M0 18 35 0l16 17-35 18Z" fill="#d5a44f" />
        <path d="M0 18 17 13l-1 22Z" fill="#2c2020" />
        <rect x="42" y="7" width="221" height="25" rx="12.5" fill="url(#penBody)" />
        <rect x="52" y="7" width="8" height="25" fill="#d9af55" />
        <rect x="225" y="7" width="10" height="25" fill="#d9af55" />
        <path d="M257 8h33l12 12-12 12h-33Z" fill="#46121d" />
      </g>

      <g fill="#d66070" opacity="0.88">
        <ellipse cx="112" cy="209" rx="20" ry="33" transform="rotate(36 112 209)" />
        <ellipse cx="171" cy="491" rx="22" ry="34" transform="rotate(64 171 491)" />
        <ellipse cx="742" cy="486" rx="19" ry="31" transform="rotate(31 742 486)" />
        <ellipse cx="820" cy="438" rx="22" ry="34" transform="rotate(70 820 438)" />
        <ellipse cx="716" cy="175" rx="15" ry="25" transform="rotate(-55 716 175)" />
      </g>
    </svg>
  );
}
