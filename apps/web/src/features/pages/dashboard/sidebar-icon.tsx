import type { LucideIcon } from "lucide-react";
import {
  Archive,
  Award,
  CalendarHeart,
  FileEdit,
  FileText,
  Gift,
  HandHeart,
  Heart,
  Home,
  LayoutTemplate,
  Mail,
  PartyPopper,
  PenLine,
  QrCode,
  Share2,
  Smile,
  Sparkles,
  Star,
  Users,
} from "lucide-react";

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

const ICONS: Record<SidebarIconName, LucideIcon> = {
  home: Home,
  templates: LayoutTemplate,
  pages: FileText,
  heart: Heart,
  gift: Gift,
  rings: Sparkles,
  calendar: CalendarHeart,
  thankyou: HandHeart,
  ribbon: Award,
  responses: Mail,
  favorites: Star,
  pen: PenLine,
  celebration: PartyPopper,
  share: Share2,
  qr: QrCode,
  visitors: Users,
  reactions: Smile,
  draft: FileEdit,
  archive: Archive,
};

export function SidebarIcon({
  name,
  className,
}: {
  name: SidebarIconName;
  className?: string;
}): React.JSX.Element {
  const Icon = ICONS[name] ?? LayoutTemplate;
  return (
    <Icon
      aria-hidden="true"
      focusable="false"
      size={20}
      strokeWidth={1.8}
      className={className}
    />
  );
}
