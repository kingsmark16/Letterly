export const capabilityFlow = [
  {
    label: "Create",
    title: "Start with the words",
    description:
      "Write the message, name the recipient, and shape the opening.",
  },
  {
    label: "Personalize",
    title: "Add what makes it yours",
    description: "Bring in images, music, questions, and optional sections.",
  },
  {
    label: "Protect",
    title: "Choose who can open it",
    description: "Keep it private or add a password before sharing.",
  },
  {
    label: "Share",
    title: "Publish one meaningful link",
    description: "Preview your page first, then share it when it feels ready.",
  },
  {
    label: "Receive",
    title: "Make room for a response",
    description:
      "Let visitors answer your questions or leave a private message.",
  },
  {
    label: "Read responses",
    title: "Keep their thoughts close",
    description: "Read private responses from your creator dashboard.",
  },
] as const;

export const creatorPath = [
  "Choose a template",
  "Write and customize",
  "Preview the page",
  "Publish and share",
] as const;

export const visitorPath = [
  "Open the page",
  "Read the story",
  "Answer the moment",
  "Leave a private message",
] as const;

export const frequentlyAskedQuestions = [
  {
    question: "What is Letterly?",
    answer:
      "Letterly gives meaningful words their own place. Choose a supported template, write your message, add the moments that belong with it, preview the page, and share one personal link when it feels ready.",
  },
  {
    question: "Which templates can I use?",
    answer:
      "The launch catalog includes two Confession templates: Secret Letter and Choose Your Heart. Each template has its own supported fields, so the catalog shows what you can add before you begin.",
  },
  {
    question: "Do I need an account to create a page?",
    answer:
      "Yes. Sign in with Google or Facebook to create, save, and manage your Letterly pages and drafts. Letterly never publishes a page without your decision.",
  },
  {
    question: "Do visitors need an account to open my page?",
    answer:
      "No. Anyone with the shared link can open an unprotected published page without a Letterly account. If you add a password, the visitor must unlock it first.",
  },
  {
    question: "What can I add to a page?",
    answer:
      "It depends on the template. Secret Letter can support a recipient name, message, images, optional music or voice, questions, private visitor messages, and password protection. Choose Your Heart focuses on guided questions and private messages.",
  },
  {
    question: "Can I keep my page private?",
    answer:
      "Yes. Drafts stay private while you write, and you choose when a page becomes shareable. You can also unpublish or archive a page later from the creator flow.",
  },
  {
    question: "Can I add a password to my page?",
    answer:
      "Yes, when the selected template supports password protection. Visitors see a calm unlock screen and protected content appears only after the page is unlocked.",
  },
  {
    question: "How do private replies work?",
    answer:
      "When responses are enabled, a visitor can answer the page's questions and leave a separate private message. Only the page creator can read those responses.",
  },
  {
    question: "Can I edit a page after publishing it?",
    answer:
      "Yes. You keep control of the page lifecycle and can return to edit, preview, publish, unpublish, archive, or delete a page through your creator dashboard.",
  },
  {
    question: "How can I share a published page?",
    answer:
      "Every published page has a canonical link you can copy or share as a QR code. The QR code points to the page and never contains its password.",
  },
  {
    question: "Will my page appear in search results?",
    answer:
      "Letterly marks public pages as noindex, but a published page can still be opened by anyone who has its link unless you protect it with a password. Share the link thoughtfully.",
  },
  {
    question: "What if I see a page that needs attention?",
    answer:
      "Use the Report this page option on a public page. Reports help Letterly review content while keeping creator and visitor details private.",
  },
] as const;
