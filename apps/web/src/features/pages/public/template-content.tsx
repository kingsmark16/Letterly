import {
  webTemplateRegistrations,
  type WebTemplateId,
} from "../../../templates/registration";
import {
  createWebTemplateImplementationRegistry,
  type WebTemplateImplementation,
} from "../../../templates/implementation-registry";
import { PublicPageUnavailableError } from "../../../lib/public-page";
import { PublicTemplateClientBoundary } from "./public-template-client-boundary";
import type { PublicTemplateContext } from "./template-context";

function renderSecretLetter({
  page,
  slug,
  skipOpening,
}: PublicTemplateContext): React.JSX.Element {
  if ("state" in page || "publishedGraphVersion" in page)
    throw new PublicPageUnavailableError();

  return (
    <PublicTemplateClientBoundary
      registryKey="confession.secret-letter"
      version={1}
      payload={{
        slug,
        skipOpening,
        model: {
          ...(page.title !== undefined ? { title: page.title } : {}),
          recipientName: page.recipientName,
          mainMessage: page.mainMessage,
          ...(page.creatorName !== undefined
            ? { creatorName: page.creatorName }
            : {}),
          sections: [],
          images: page.images,
        },
        ...(page.audio?.mediaUrl !== undefined
          ? { audioUrl: page.audio.mediaUrl }
          : {}),
        ...(page.audio?.title !== undefined
          ? { audioTitle: page.audio.title }
          : {}),
        ...(page.audio?.durationMilliseconds !== undefined
          ? { audioDurationMilliseconds: page.audio.durationMilliseconds }
          : {}),
        ...(page.audioLink !== undefined ? { audioLink: page.audioLink } : {}),
        ...(page.response !== undefined ? { response: page.response } : {}),
      }}
    />
  );
}

function renderChooseYourHeart({
  page,
  slug,
}: PublicTemplateContext): React.JSX.Element {
  if (!("publishedGraphVersion" in page))
    throw new PublicPageUnavailableError();

  return (
    <PublicTemplateClientBoundary
      registryKey="confession.choose-your-heart"
      version={1}
      payload={{ page, slug }}
    />
  );
}

const publicPresentations = {
  "confession.secret-letter": {
    registryKey: "confession.secret-letter",
    version: 1,
    implementation: renderSecretLetter,
  },
  "confession.choose-your-heart": {
    registryKey: "confession.choose-your-heart",
    version: 1,
    implementation: renderChooseYourHeart,
  },
} satisfies Record<
  WebTemplateId,
  WebTemplateImplementation<
    (context: PublicTemplateContext) => React.JSX.Element
  >
>;
const resolvePublicPresentation = createWebTemplateImplementationRegistry(
  webTemplateRegistrations,
  publicPresentations,
);

export function renderPublicTemplate(
  context: PublicTemplateContext,
): React.JSX.Element {
  const { template } = context.page;
  const resolved = resolvePublicPresentation({
    templateKey: template.key,
    version: template.version,
    ...("registryKey" in template ? { registryKey: template.registryKey } : {}),
  });
  if (!resolved) throw new PublicPageUnavailableError();
  return resolved.implementation(context);
}
