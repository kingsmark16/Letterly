import { DashboardIcon } from "./dashboard-icons";

export type SidebarIconName =
  | "home"
  | "pen"
  | "templates"
  | "pages"
  | "heart"
  | "gift"
  | "rings"
  | "celebration"
  | "share"
  | "qr"
  | "visitors"
  | "reactions"
  | "draft"
  | "archive";

const paths = {
  templates: "M8 3h12v15H8zM5 6H3v15h13v-2",
  gift: "M4 10h16v11H4zM3 6h18v4H3zM12 6v15M12 6C4 7 5 0 9 3l3 3Zm0 0c8 1 7-6 3-3l-3 3Z",
  rings:
    "M14 12a6 7 0 1 1-12 0 6 7 0 1 1 12 0Zm8 0a6 7 0 1 1-12 0 6 7 0 1 1 12 0Z",
  celebration:
    "m3 21 5-15 10 10-15 5Zm4-10 6 6M14 3v3M20 4l-3 4M21 10h-3M10 2l1 2M21 15l1 1",
  share: "m2 10 20-8-8 20-3-9-9-3Zm9 3L22 2",
  qr: "M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h2v2h-2zM21 14v4h-3v3M14 20v1M21 21h.01",
  visitors: "M3 14h4v7H3zM10 9h4v12h-4zM17 3h4v18h-4z",
  reactions:
    "M22 12a10 10 0 1 1-20 0 10 10 0 1 1 20 0ZM7 14c2 4 8 4 10 0M8 8h.01M16 8h.01",
  draft: "M5 2h9l5 5v15H5V2Zm9 0v6h5M9 16h.01",
  archive: "M3 4h18v4H3zM4 8v13h16V8M9 12h6l-3 3-3-3Z",
} as const;

export function SidebarIcon({
  name,
}: {
  name: SidebarIconName;
}): React.JSX.Element {
  if (
    name === "home" ||
    name === "pen" ||
    name === "pages" ||
    name === "heart"
  ) {
    return <DashboardIcon name={name} />;
  }
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
      <path d={paths[name]} />
    </svg>
  );
}
