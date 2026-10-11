"use client";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import {
  webTemplateRegistrations,
  type WebTemplateId,
  type WebTemplateIdentity,
} from "../../../templates/registration";
import {
  createWebTemplateImplementationRegistry,
  type WebTemplateImplementation,
} from "../../../templates/implementation-registry";

const previews = {
  "confession.secret-letter": {
    registryKey: "confession.secret-letter",
    version: 1,
    implementation: dynamic(() =>
      import("./secret-letter-preview").then(
        (module) => module.SecretLetterCatalogPreview,
      ),
    ),
  },
  "confession.choose-your-heart": {
    registryKey: "confession.choose-your-heart",
    version: 1,
    implementation: dynamic(() =>
      import("../../../templates/choose-your-heart/preview").then(
        (module) => module.ChooseYourHeartPreview,
      ),
    ),
  },
} satisfies Record<WebTemplateId, WebTemplateImplementation<ComponentType>>;
const resolvePreview = createWebTemplateImplementationRegistry(
  webTemplateRegistrations,
  previews,
);

export function RegisteredTemplatePreview({
  identity,
}: {
  identity: WebTemplateIdentity;
}): React.JSX.Element {
  const resolved = resolvePreview(identity);
  if (!resolved) throw new Error("Template preview implementation unavailable");
  const Preview = resolved.implementation;
  return <Preview />;
}
