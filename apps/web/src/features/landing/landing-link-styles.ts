export const announcementLinkClasses =
  "gap-2 min-h-[1.5rem] text-[color:var(--landing-ink)] font-bold hover:text-[color:var(--landing-ink)] [@media(max-width:48rem)]:flex-none [@media(max-width:48rem)]:min-h-10 [@media(max-width:48rem)]:gap-1 [@media(max-width:48rem)]:text-[0.68rem]";

export const signInLinkClasses =
  "min-h-target text-[color:var(--landing-muted)] text-small leading-[1.6] font-semibold [transition-property:color] duration-[120ms] [transition-timing-function:var(--ease-standard)] hover:text-[color:var(--landing-orange)] [@media(max-width:48rem)]:min-h-10 [@media(max-width:48rem)]:px-[0.55rem] [@media(max-width:48rem)]:text-[0.72rem] [@media(max-width:48rem)]:whitespace-nowrap";

const primaryLinkClasses =
  "justify-center gap-2 border border-[color:var(--landing-orange)] bg-[color:var(--landing-orange)] px-5 py-3 text-white [transition:color_120ms_var(--ease-standard),background-color_120ms_var(--ease-standard),border-color_120ms_var(--ease-standard),transform_120ms_var(--ease-standard),translate_var(--letterly-motion-standard)_var(--ease-gentle)] hover:border-[color:var(--letterly-wine-hover)] hover:bg-[color:var(--letterly-wine-hover)] hover:text-white active:[transform:scale(0.98)]";

export const headerSignUpLinkClasses = `${primaryLinkClasses} min-h-target rounded-small text-small leading-[1.3] font-bold [@media(max-width:48rem)]:min-h-10 [@media(max-width:48rem)]:px-[0.75rem] [@media(max-width:48rem)]:text-[0.72rem] [@media(max-width:48rem)]:whitespace-nowrap`;

export const heroStartLinkClasses = `${primaryLinkClasses} h-auto min-h-[2.875rem] rounded-full text-[0.78rem] leading-[1.3] font-semibold uppercase tracking-[0.08em]`;

export const categoryPromptLinkClasses =
  "grid grid-cols-[auto_auto_auto] items-center justify-center w-[min(100%,34rem)] min-h-14 gap-3 py-2 pr-4 pl-2 mx-auto mt-[1.25rem] text-center text-[color:var(--landing-ink)] bg-[color:var(--landing-surface)] border border-[color:var(--landing-line)] rounded-medium [box-shadow:var(--landing-shadow)] [transition:border-color_120ms_var(--ease-standard),transform_120ms_var(--ease-standard),translate_var(--letterly-motion-standard)_var(--ease-gentle)] hover:border-[color:var(--landing-orange)] hover:[transform:translateY(-0.125rem)] [@media(max-width:48rem)]:grid-cols-[1fr_auto] [@media(max-width:48rem)]:min-h-16 [@media(max-width:48rem)]:gap-2 [@media(max-width:48rem)]:pr-3 [@media(max-width:48rem)]:mt-4";

export const catalogRecoveryLinkClasses =
  "min-h-target gap-2 text-[color:var(--landing-orange)] text-small leading-[1.6] font-bold underline decoration-1 underline-offset-[0.25rem] [transition-property:color] duration-[120ms] [transition-timing-function:var(--ease-standard)] hover:text-[color:var(--landing-orange)]";
