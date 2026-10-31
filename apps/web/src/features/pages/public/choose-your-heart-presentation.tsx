"use client";

import { useEffect } from "react";
import { ChooseYourHeartPage } from "./choose-your-heart-page";
import { PublicVisitTracker } from "./public-visit-tracker";
import type { PublicTemplatePresentationProps } from "./presentation-types";

export function ChooseYourHeartPresentation(
  props: PublicTemplatePresentationProps,
): React.JSX.Element {
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  if (
    props.registryKey !== "confession.choose-your-heart" ||
    props.version !== 1
  ) {
    return <p role="status">This design version is unavailable.</p>;
  }

  const { payload } = props;
  return (
    <div className="fixed inset-0 h-full w-full overflow-hidden bg-[#140410]">
      <PublicVisitTracker slug={payload.slug} />
      <ChooseYourHeartPage
        key={payload.slug}
        contained
        page={payload.page}
        slug={payload.slug}
      />
    </div>
  );
}
