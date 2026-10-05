import Link from "next/link";
import { SiteFooter } from "../../../components/site-footer";
import { siteFooterLinkClasses } from "../../../components/site-footer-link";

export function DashboardFooter(): React.JSX.Element {
  return (
    <SiteFooter
      bottom={<span>© {new Date().getFullYear()} Letterly</span>}
      links={
        <>
          <Link className={siteFooterLinkClasses} href="/privacy">
            Privacy and safety
          </Link>
          <Link className={siteFooterLinkClasses} href="/terms">
            Terms
          </Link>
        </>
      }
      navigationLabel="Workspace footer navigation"
    />
  );
}
