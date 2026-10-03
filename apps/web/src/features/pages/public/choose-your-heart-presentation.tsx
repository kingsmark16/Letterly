"use client";

import { ChooseYourHeartPage } from "./choose-your-heart-page";
import { PublicReportForm } from "./public-report-form";
import { PublicVisitTracker } from "./public-visit-tracker";
import type { PublicTemplatePresentationProps } from "./presentation-types";

export function ChooseYourHeartPresentation(
  props: PublicTemplatePresentationProps,
): React.JSX.Element {
  if (
    props.registryKey !== "confession.choose-your-heart" ||
    props.version !== 1
  ) {
    return <p role="status">This design version is unavailable.</p>;
  }

  const { payload } = props;
  return (
    <>
      <PublicVisitTracker slug={payload.slug} />
      <ChooseYourHeartPage
        key={payload.slug}
        page={payload.page}
        slug={payload.slug}
      />
      <PublicReportForm slug={payload.slug} />
    </>
  );
}
