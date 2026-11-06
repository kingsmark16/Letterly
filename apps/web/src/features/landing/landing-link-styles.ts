export const signInLinkClasses =
  "min-h-target text-[color:var(--landing-muted)] text-small leading-[1.6] font-semibold [transition-property:color] duration-[120ms] [transition-timing-function:var(--ease-standard)] hover:text-[color:var(--landing-orange)] [@media(max-width:48rem)]:px-[0.55rem] [@media(max-width:48rem)]:text-[0.72rem] [@media(max-width:48rem)]:whitespace-nowrap";

const primaryLinkClasses =
  "justify-center gap-2 border border-[color:var(--landing-orange)] bg-[color:var(--landing-orange)] px-5 py-3 text-[color:var(--landing-on-accent)] [transition:color_120ms_var(--ease-standard),background-color_120ms_var(--ease-standard),border-color_120ms_var(--ease-standard),transform_120ms_var(--ease-standard),translate_var(--letterly-motion-standard)_var(--ease-gentle)] hover:border-[color:var(--letterly-wine-hover)] hover:bg-[color:var(--letterly-wine-hover)] hover:text-[color:var(--landing-on-accent)] motion-safe:active:[transform:scale(0.98)]";

export const headerSignUpLinkClasses = `${primaryLinkClasses} min-h-target rounded-small text-small leading-[1.3] font-bold [@media(max-width:48rem)]:px-[0.75rem] [@media(max-width:48rem)]:text-[0.72rem] [@media(max-width:48rem)]:whitespace-nowrap`;

export const heroStartLinkClasses = `${primaryLinkClasses} h-auto min-h-12 rounded-small text-[0.875rem] leading-[1.4] font-semibold`;

export const catalogRecoveryLinkClasses =
  "min-h-target gap-2 text-[color:var(--landing-orange)] text-small leading-[1.6] font-bold underline decoration-1 underline-offset-[0.25rem] [transition-property:color] duration-[120ms] [transition-timing-function:var(--ease-standard)] hover:text-[color:var(--landing-orange)]";
