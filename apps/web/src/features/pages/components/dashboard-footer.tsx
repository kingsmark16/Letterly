import Link from "next/link";

export function DashboardFooter(): React.JSX.Element {
  return (
    <footer className="border-t border-border bg-canvas px-4 py-6 text-label text-ink-muted sm:px-7 lg:px-8">
      <div className="mx-auto flex max-w-[var(--letterly-container-max)] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>Letterly, a quiet place for the words that matter.</p>
        <nav
          aria-label="Workspace footer navigation"
          className="flex flex-wrap gap-x-5 gap-y-2"
        >
          <Link
            className="inline-flex min-h-[var(--letterly-target-min)] items-center underline decoration-transparent underline-offset-4 transition-[color,text-decoration-color] duration-[var(--letterly-motion-fast)] hover:text-wine hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
            href="/privacy"
          >
            Privacy and safety
          </Link>
          <Link
            className="inline-flex min-h-[var(--letterly-target-min)] items-center underline decoration-transparent underline-offset-4 transition-[color,text-decoration-color] duration-[var(--letterly-motion-fast)] hover:text-wine hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
            href="/terms"
          >
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
