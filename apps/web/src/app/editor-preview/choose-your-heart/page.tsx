import type { Metadata } from "next";
import { EditorJourneyPreviewFrameContent } from "@/features/pages/editor/editor-journey-preview-frame-content";

export const metadata: Metadata = {
  title: "Letter preview | Letterly",
  robots: { index: false, follow: false },
};

export default function EditorJourneyPreviewPage(): React.JSX.Element {
  return (
    <>
      <style>{`
        html,
        body {
          scrollbar-width: none;
        }

        html::-webkit-scrollbar,
        body::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <EditorJourneyPreviewFrameContent />
    </>
  );
}
