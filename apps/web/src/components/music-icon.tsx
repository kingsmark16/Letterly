type MusicIconName =
  | "note"
  | "upload"
  | "youtube"
  | "heart"
  | "trash"
  | "volume"
  | "back"
  | "forward"
  | "arrow";

export function MusicIcon({
  name,
  className,
}: {
  name: MusicIconName;
  className?: string;
}): React.JSX.Element {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {name === "note" ? (
        <>
          <path d="M9 18V5l12-3v13M9 9l12-3" />
          <ellipse cx="6" cy="18" rx="3" ry="2.5" />
          <ellipse cx="18" cy="15" rx="3" ry="2.5" />
        </>
      ) : null}
      {name === "upload" ? (
        <>
          <path d="M7 17H6a4 4 0 0 1-1-7.9A7 7 0 0 1 18.5 8 4.5 4.5 0 0 1 19 17h-2M12 21V11m-4 4 4-4 4 4" />
        </>
      ) : null}
      {name === "youtube" ? (
        <>
          <rect
            x="2"
            y="5"
            width="20"
            height="14"
            rx="4"
            fill="currentColor"
            stroke="none"
          />
          <path
            d="m10 9 6 3-6 3Z"
            fill="var(--music-paper, #fff8f6)"
            stroke="none"
          />
        </>
      ) : null}
      {name === "heart" ? (
        <path d="M20.8 4.6a5.4 5.4 0 0 0-8.8 1.7 5.4 5.4 0 0 0-8.8-1.7C-1.1 9.1 5.8 16 12 21c6.2-5 13.1-11.9 8.8-16.4Z" />
      ) : null}
      {name === "trash" ? (
        <>
          <path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7" />
        </>
      ) : null}
      {name === "volume" ? (
        <>
          <path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
        </>
      ) : null}
      {name === "back" ? (
        <>
          <path d="M5 5v14m14-14L7 12l12 7Z" fill="currentColor" />
        </>
      ) : null}
      {name === "forward" ? (
        <>
          <path d="M19 5v14M5 5l12 7-12 7Z" fill="currentColor" />
        </>
      ) : null}
      {name === "arrow" ? <path d="M4 12h16m-6-6 6 6-6 6" /> : null}
    </svg>
  );
}

export function MusicFlourish({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 600 160"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M-20 135C65 35 85 160 175 119S296 90 350 122 474 161 620 82M24 158C74 130 82 77 80 26M43 146C22 118 21 89 30 69M64 118C108 113 117 80 113 60"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M80 49C45 19 67 1 80 23c17-23 35-2 0 26ZM112 81c-20-30 5-41 10-18 24-9 31 15-10 18ZM29 92C-1 77 12 52 29 72c13-24 34-7 0 20Z"
        fill="currentColor"
        opacity=".55"
      />
      <path
        d="M252 104c-22-20-8-32 2-17 13-15 27 0-2 17ZM486 118c-15-17-3-23 3-12 11-9 19 3-3 12Z"
        fill="currentColor"
        opacity=".7"
      />
    </svg>
  );
}
