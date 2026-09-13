import styles from "./message-scene.module.css";

const roses = [
  [34, 47, 17],
  [64, 36, 18],
  [96, 48, 16],
  [123, 32, 17],
  [151, 43, 18],
  [174, 65, 15],
  [43, 78, 19],
  [78, 72, 18],
  [111, 78, 20],
  [147, 82, 18],
  [68, 108, 17],
  [103, 112, 19],
  [133, 110, 15],
  [91, 141, 16],
  [114, 146, 13],
  [103, 170, 10],
];

/** Printed stationery decoration. The reading surface never rotates. */
export function MessageScene(): React.JSX.Element {
  return (
    <svg
      className={styles.ornament}
      viewBox="0 0 210 680"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g stroke="currentColor" strokeWidth="1.2">
        <path d="M103 173 C70 248 124 285 98 359 S83 448 96 525 S103 625 80 680" />
        <path d="M93 261 C45 225 44 281 75 274 C89 270 74 255 66 264 M94 387 C142 349 143 400 117 394 C105 390 115 375 123 384 M89 488 C45 451 39 501 66 496 C79 493 65 477 59 486" />
      </g>
      <g fill="currentColor">
        {roses.map(([x, y, radius], index) => (
          <g
            key={index}
            transform={`translate(${x} ${y}) rotate(${index * 31})`}
          >
            <circle r={radius} />
            <path
              d="M-3 -3 C8 -14 15 0 4 6 C-9 12 -17 -4 -7 -12 M-1 2 C-6 -6 5 -9 7 -2 M-13 5 C-4 17 11 12 15 3"
              stroke="var(--stationery-paper)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        ))}
        <path d="M89 229 C57 224 69 203 79 212 C80 190 104 204 89 229 M96 335 C103 303 126 320 115 333 C138 337 114 354 96 335 M94 528 C63 528 64 507 78 511 C66 487 98 492 94 528" />
      </g>
      <g stroke="#efb4cc" strokeWidth="1.2">
        <path d="M35 345 C64 410 12 438 29 510 S48 609 27 680 M142 534 C114 588 158 620 140 680" />
      </g>
      <g fill="#f3bfd5">
        <path d="M35 350 C-5 318 7 296 30 309 C52 285 82 318 35 350 M142 541 C98 507 111 484 139 500 C167 478 190 507 142 541" />
      </g>
    </svg>
  );
}
