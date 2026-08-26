export const capabilityLabels: Record<string, string> = {
  images: "Images",
  audio: "Music",
  questions: "Questions",
  visitorMessage: "Private replies",
  passwordProtection: "Password protection",
};

const templateIntroByKey: Record<string, string> = {
  "secret-letter": "For the words you want someone to keep.",
  "choose-your-heart": "Turn a heartfelt question into an interactive journey.",
};

export function getTemplateIntro(
  templateKey: string,
  description: string | null,
): string {
  return (
    templateIntroByKey[templateKey] ??
    description ??
    "A personal way to say what matters."
  );
}
