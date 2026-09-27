import type { Metadata } from "next";
import { EditorLetterPreviewFrameContent } from "../../../src/features/pages/components/editor-letter-preview-frame-content";

export const metadata: Metadata = {
  title: "Letter preview | Letterly",
  robots: { index: false, follow: false },
};

export default function EditorLetterPreviewPage(): React.JSX.Element {
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
      <EditorLetterPreviewFrameContent />
    </>
  );
}
