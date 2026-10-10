import type { PublicSecretLetterProjection } from "@letterly/contracts/pages";
import type { PageJourneyPublicPageProjection } from "@letterly/contracts/page-journeys";
import { Status } from "@repo/ui/status";
import { SecretLetterRenderer } from "../../../templates/secret-letter/renderer";
import {
  getPublicWebTemplate,
  type WebTemplateId,
} from "../../../templates/registration";
import { PublicPageUnavailableError } from "../../../lib/public-page";
import { VisitorResponseForm } from "./visitor-response-form";
import { PublicReportForm } from "./public-report-form";
import { PublicVisitTracker } from "./public-visit-tracker";
import { ChooseYourHeartPage } from "./choose-your-heart-page";

interface PublicTemplateContext {
  page: PublicSecretLetterProjection | PageJourneyPublicPageProjection;
  slug: string;
  skipOpening: boolean;
}
function renderSecretLetter({
  page,
  slug,
  skipOpening,
}: PublicTemplateContext): React.JSX.Element {
  if ("state" in page || "publishedGraphVersion" in page)
    throw new PublicPageUnavailableError();
  return (
    <Status state="idle">
      <PublicVisitTracker slug={slug} />
      <div>
        <SecretLetterRenderer
          model={{
            ...(page.title !== undefined ? { title: page.title } : {}),
            recipientName: page.recipientName,
            mainMessage: page.mainMessage,
            ...(page.creatorName !== undefined
              ? { creatorName: page.creatorName }
              : {}),
            sections: [],
            images: page.images,
          }}
          showAudioPlayerWhenEmpty
          audioUrl={page.audio?.mediaUrl}
          audioTitle={page.audio?.title}
          audioDurationMilliseconds={page.audio?.durationMilliseconds}
          audioLink={page.audioLink}
          audioMetadataUrl={
            page.audioLink
              ? `/p/${encodeURIComponent(slug)}/audio/metadata`
              : undefined
          }
          skipOpening={skipOpening}
          afterQuestion={<PublicReportForm slug={slug} />}
        >
          {page.response?.enabled ? (
            <VisitorResponseForm slug={slug} response={page.response} />
          ) : null}
        </SecretLetterRenderer>
      </div>
    </Status>
  );
}
function renderChooseYourHeart({
  page,
  slug,
}: PublicTemplateContext): React.JSX.Element {
  if (!("publishedGraphVersion" in page))
    throw new PublicPageUnavailableError();
  return (
    <>
      <PublicVisitTracker slug={slug} />
      <ChooseYourHeartPage key={slug} page={page} slug={slug} />
      <PublicReportForm slug={slug} />
    </>
  );
}
const publicPresentations = {
  "confession.secret-letter": renderSecretLetter,
  "confession.choose-your-heart": renderChooseYourHeart,
} satisfies Record<
  WebTemplateId,
  (context: PublicTemplateContext) => React.JSX.Element
>;

export function renderPublicTemplate(
  context: PublicTemplateContext,
): React.JSX.Element {
  const registration = getPublicWebTemplate(context.page.template);
  if (!registration) throw new PublicPageUnavailableError();
  return publicPresentations[registration.id](context);
}
