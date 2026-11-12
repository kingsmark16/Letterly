export type SidebarIconName =
  | "home"
  | "pen"
  | "templates"
  | "pages"
  | "responses"
  | "heart"
  | "gift"
  | "rings"
  | "calendar"
  | "thankyou"
  | "ribbon"
  | "favorites"
  | "celebration"
  | "share"
  | "qr"
  | "visitors"
  | "reactions"
  | "draft"
  | "archive";

export function SidebarIcon({
  name,
}: {
  name: SidebarIconName;
}): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === "home" ? (
        <>
          <path d="M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v6H4.5A1.5 1.5 0 0 1 3 19.5v-9z" />
          <path d="M9.5 21v-5a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5v5" />
        </>
      ) : null}
      {name === "templates" ? (
        <>
          <rect x="3" y="4" width="13" height="16" rx="2" />
          <path d="M7 8h5M7 11h5" />
          <path d="M16 8h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-1" />
        </>
      ) : null}
      {name === "pages" ? (
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
          <path d="M14 2v6h6M8 13h8M8 17h5" />
        </>
      ) : null}
      {name === "heart" ? (
        <path d="M19.5 12.572 12 20l-7.5-7.428A5 5 0 0 1 12 5.678a5 5 0 0 1 7.5 6.894z" />
      ) : null}
      {name === "gift" ? (
        <>
          <rect x="3" y="8" width="18" height="4" rx="1" />
          <path d="M12 8v13" />
          <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
          <path d="M7.5 8a2.5 2.5 0 0 1 0-5A3.5 3.5 0 0 1 12 8a3.5 3.5 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
        </>
      ) : null}
      {name === "rings" ? (
        <>
          <circle cx="9" cy="13" r="5" />
          <circle cx="15" cy="13" r="5" />
          <path d="m12 4.5.6 1.4 1.5.2-1.1 1.1.3 1.5-1.3-.7-1.3.7.3-1.5-1.1-1.1 1.5-.2z" />
        </>
      ) : null}
      {name === "calendar" ? (
        <>
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
          <path d="M12 14.5s-1.2-.9-1.8-1.4a1.2 1.2 0 0 0-1.7 1.7l3.5 3.2 3.5-3.2a1.2 1.2 0 0 0-1.7-1.7c-.6.5-1.8 1.4-1.8 1.4z" />
        </>
      ) : null}
      {name === "thankyou" ? (
        <>
          <path d="M12 21v-8" />
          <path d="M12 13a4.5 4.5 0 0 0 4.5-4.5C16.5 6 12 3 12 3S7.5 6 7.5 8.5A4.5 4.5 0 0 0 12 13z" />
          <path d="M12 17c-2 0-3.8-.9-4.3-2.3 1.4 0 3.3.4 4.3 2.3z" />
          <path d="M12 19c2 0 3.8-.9 4.3-2.3-1.4 0-3.3.4-4.3 2.3z" />
        </>
      ) : null}
      {name === "ribbon" ? (
        <>
          <circle cx="12" cy="9" r="6" />
          <circle cx="12" cy="9" r="2.5" />
          <path d="m8.2 14.3-2.2 6.7 6-2.5 6 2.5-2.2-6.7" />
        </>
      ) : null}
      {name === "responses" ? (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
          <circle cx="12" cy="13" r="1.5" fill="currentColor" />
        </>
      ) : null}
      {name === "favorites" ? (
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      ) : null}
      {name === "pen" ? (
        <>
          <path d="m18 2 4 4-14 14H4v-4L18 2z" />
          <path d="m15 5 4 4" />
        </>
      ) : null}
      {name === "celebration" ? (
        <>
          <path d="m3 21 5-15 10 10-15 5Zm4-10 6 6" />
          <path d="M14 3v3M20 4l-3 4M21 10h-3M10 2l1 2M21 15l1 1" />
        </>
      ) : null}
      {name === "share" ? (
        <>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
        </>
      ) : null}
      {name === "qr" ? (
        <>
          <rect x="3" y="3" width="6" height="6" rx="1" />
          <rect x="15" y="3" width="6" height="6" rx="1" />
          <rect x="3" y="15" width="6" height="6" rx="1" />
          <path d="M15 15h2v2h-2zM21 14v4h-3v3M14 20v1M21 21h.01" />
        </>
      ) : null}
      {name === "visitors" ? (
        <path d="M3 14h4v7H3zM10 9h4v12h-4zM17 3h4v18h-4z" />
      ) : null}
      {name === "reactions" ? (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M8 15s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
        </>
      ) : null}
      {name === "draft" ? (
        <>
          <path d="M5 2h9l5 5v15H5V2z" />
          <path d="M14 2v6h5M9 16h6" />
        </>
      ) : null}
      {name === "archive" ? (
        <>
          <rect x="3" y="4" width="18" height="4" rx="1" />
          <path d="M4 8v12a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8M10 12h4" />
        </>
      ) : null}
    </svg>
  );
}
