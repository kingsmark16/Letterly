import Link from "next/link";
import { SiteFooter } from "../../../components/site-footer";

export function DashboardFooter(): React.JSX.Element {
  return (
    <SiteFooter
      bottom={<span>© {new Date().getFullYear()} Letterly</span>}
      links={
        <>
          <Link href="/privacy">Privacy and safety</Link>
          <Link href="/terms">Terms</Link>
        </>
      }
      navigationLabel="Workspace footer navigation"
    />
  );
}
