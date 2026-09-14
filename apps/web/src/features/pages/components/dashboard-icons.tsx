type DashboardIconName =
  | "arrow-up-right"
  | "book"
  | "check"
  | "clock"
  | "grid"
  | "heart"
  | "home"
  | "inbox"
  | "lock"
  | "logout"
  | "pages"
  | "pen"
  | "plus"
  | "spark";

interface DashboardIconProps {
  name: DashboardIconName;
  className?: string;
}

export function DashboardIcon({
  name,
  className,
}: DashboardIconProps): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {name === "home" ? (
        <>
          <path
            d="m4 10 8-6 8 6v9.25A1.75 1.75 0 0 1 18.25 21h-3.5v-5.5h-1.5V21h-3.5A1.75 1.75 0 0 1 8 19.25V10"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
          <path
            d="M2.75 11.25 12 4l9.25 7.25"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
        </>
      ) : null}
      {name === "pages" ? (
        <>
          <path
            d="M6.5 4.25h9.25L18.5 7v12.75H6.5V4.25Z"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
          <path
            d="M15.75 4.5V7h2.5M9.25 11h6.5M9.25 14.25h4.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
        </>
      ) : null}
      {name === "grid" ? (
        <>
          <rect
            height="6.5"
            rx="1.25"
            stroke="currentColor"
            strokeWidth="1.6"
            width="6.5"
            x="3.25"
            y="3.25"
          />
          <rect
            height="6.5"
            rx="1.25"
            stroke="currentColor"
            strokeWidth="1.6"
            width="6.5"
            x="14.25"
            y="3.25"
          />
          <rect
            height="6.5"
            rx="1.25"
            stroke="currentColor"
            strokeWidth="1.6"
            width="6.5"
            x="3.25"
            y="14.25"
          />
          <rect
            height="6.5"
            rx="1.25"
            stroke="currentColor"
            strokeWidth="1.6"
            width="6.5"
            x="14.25"
            y="14.25"
          />
        </>
      ) : null}
      {name === "inbox" ? (
        <>
          <path
            d="M4 5.25h16v11.5A2.25 2.25 0 0 1 17.75 19h-11.5A2.25 2.25 0 0 1 4 16.75V5.25Z"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
          <path
            d="M4.25 13h4l1.25 2h5l1.25-2h4"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
        </>
      ) : null}
      {name === "plus" ? (
        <path
          d="M12 5v14M5 12h14"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      ) : null}
      {name === "arrow-up-right" ? (
        <>
          <path
            d="M6.5 17.5 17.5 6.5M9 6.5h8.5V15"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
        </>
      ) : null}
      {name === "lock" ? (
        <>
          <rect
            height="9"
            rx="1.75"
            stroke="currentColor"
            strokeWidth="1.6"
            width="13"
            x="5.5"
            y="10.25"
          />
          <path
            d="M8.25 10.25V7.75a3.75 3.75 0 0 1 7.5 0v2.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.6"
          />
          <path
            d="M12 14v1.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.6"
          />
        </>
      ) : null}
      {name === "logout" ? (
        <>
          <path
            d="M14.5 5H7.75A1.75 1.75 0 0 0 6 6.75v10.5A1.75 1.75 0 0 0 7.75 19h6.75"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
          <path
            d="M13 12h8M17.5 8.5 21 12l-3.5 3.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
        </>
      ) : null}
      {name === "pen" ? (
        <>
          <path
            d="m5 16.75-.75 3 3-.75L18.5 7.75a2.12 2.12 0 0 0-3-3L5 16.75Z"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
          <path
            d="m13.75 6.25 3 3"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.6"
          />
        </>
      ) : null}
      {name === "clock" ? (
        <>
          <circle
            cx="12"
            cy="12"
            r="8.25"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M12 7.5V12l3 1.75"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
        </>
      ) : null}
      {name === "check" ? (
        <path
          d="m5.5 12.25 4.25 4.25L18.5 8"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      ) : null}
      {name === "heart" ? (
        <path
          d="M12 20.25 4.85 13.5a4.64 4.64 0 0 1-.1-6.65 4.54 4.54 0 0 1 6.4-.05L12 7.7l.85-.9a4.54 4.54 0 0 1 6.4.05 4.64 4.64 0 0 1-.1 6.65L12 20.25Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      ) : null}
      {name === "book" ? (
        <>
          <path
            d="M4.25 5.75A1.75 1.75 0 0 1 6 4h5.25v15.5H6a1.75 1.75 0 0 0-1.75 1.75V5.75ZM19.75 5.75A1.75 1.75 0 0 0 18 4h-5.25v15.5H18a1.75 1.75 0 0 1 1.75 1.75V5.75Z"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
          <path
            d="M7 8h1.5M7 11h1.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.6"
          />
        </>
      ) : null}
      {name === "spark" ? (
        <>
          <path
            d="M12 3.5 13.5 10l6.5 2-6.5 2-1.5 6.5-1.5-6.5-6.5-2 6.5-2L12 3.5Z"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.4"
          />
          <path
            d="m19 4 .45 1.55L21 6l-1.55.45L19 8l-.45-1.55L17 6l1.55-.45L19 4Z"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.2"
          />
        </>
      ) : null}
    </svg>
  );
}
