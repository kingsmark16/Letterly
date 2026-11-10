import type { Metadata } from "next";
import { EditorLetterPreviewFrameContent } from "@/features/pages/editor/editor-letter-preview-frame-content";

export const metadata: Metadata = {
  title: "Birthday Wish preview | Letterly",
  robots: { index: false, follow: false },
};

export default function EditorBirthdayWishPreviewPage(): React.JSX.Element {
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
