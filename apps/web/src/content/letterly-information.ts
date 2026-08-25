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
    question: "Do visitors need an account to view my page?",
    answer:
      "No. A recipient can open a shared page without creating a Letterly account. A password may still be required when the creator enables protection.",
  },
  {
    question: "How do private replies work?",
    answer:
      "A visitor can send a separate private message when the creator enables responses. Only the creator of that page can read it.",
  },
  {
    question: "Can I edit my page after publishing it?",
    answer:
      "Yes. The creator controls the page lifecycle and can return to edit, preview, publish, unpublish, or remove a page through the creator flow.",
  },
  {
    question: "Can I add a password to my page?",
    answer:
      "Yes, when the selected template supports password protection. Visitors must unlock the page before private content is shown.",
  },
  {
    question: "What can I add to a Letterly page?",
    answer:
      "Available options depend on the selected template. The catalog shows whether a template supports images, music, questions, private replies, or password protection.",
  },
  {
    question: "Is my data private?",
    answer:
      "Drafts are private by default. You choose when a page is published, who receives the link, and whether it needs a password. Visitor responses stay private to the creator.",
  },
] as const;
