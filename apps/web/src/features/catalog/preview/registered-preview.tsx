"use client";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { WebTemplateId } from "../../../templates/registration";

const previews = {
  "confession.secret-letter": dynamic(() =>
    import("./secret-letter-preview").then(
      (module) => module.SecretLetterCatalogPreview,
    ),
  ),
  "confession.choose-your-heart": dynamic(() =>
    import("../../../templates/choose-your-heart/preview").then(
      (module) => module.ChooseYourHeartPreview,
    ),
  ),
} satisfies Record<WebTemplateId, ComponentType>;

export function RegisteredTemplatePreview({
  id,
}: {
  id: WebTemplateId;
}): React.JSX.Element {
  const Preview = previews[id];
  return <Preview />;
}
