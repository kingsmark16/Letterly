"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { WebTemplateId } from "../../../templates/registration";
import type { PublicTemplatePresentationProps } from "./presentation-types";

const publicPresentations = {
  "confession.secret-letter": {
    version: 1,
    component: dynamic<PublicTemplatePresentationProps>(() =>
      import("./secret-letter-presentation").then(
        (module) => module.SecretLetterPresentation,
      ),
    ),
  },
  "confession.choose-your-heart": {
    version: 1,
    component: dynamic<PublicTemplatePresentationProps>(() =>
      import("./choose-your-heart-presentation").then(
        (module) => module.ChooseYourHeartPresentation,
      ),
    ),
  },
} satisfies Record<
  WebTemplateId,
  {
    version: number;
    component: ComponentType<PublicTemplatePresentationProps>;
  }
>;

export function PublicTemplateClientBoundary(
  props: PublicTemplatePresentationProps,
): React.JSX.Element {
  const presentation = publicPresentations[props.registryKey];
  if (!presentation || presentation.version !== props.version) {
    return (
      <main className="grid min-h-screen place-items-center bg-canvas px-5 py-9 text-ink">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          This letter is not available.
        </h1>
      </main>
    );
  }

  const Presentation = presentation.component;
  return <Presentation {...props} />;
}
