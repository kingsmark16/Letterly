export type ReportStatus = "OPEN" | "REVIEWED" | "DISMISSED";

export type ReportReason =
  | "INAPPROPRIATE_CONTENT"
  | "HARASSMENT"
  | "SPAM"
  | "PERSONAL_INFORMATION"
  | "OTHER";

export type ReportOperation = "review" | "dismiss" | "reopen";

export type Confirmation =
  | {
      kind: "report";
      operation: ReportOperation;
      targetId: string;
      expectedVersion: number;
      reason: ReportReason;
      title: string;
      idempotencyKey: string;
    }
  | {
      kind: "page" | "user";
      operation: "disable" | "restore";
      targetId: string;
      expectedVersion: number;
      reason: ReportReason;
      title: string;
      idempotencyKey: string;
    }
  | {
      kind: "appeal";
      operation: "accept" | "reject";
      targetId: string;
      expectedVersion: number;
      title: string;
      idempotencyKey: string;
    };

export function humanize(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/(^|\s)\S/gu, (letter) => letter.toUpperCase());
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function isReportStatus(value: string | null): value is ReportStatus {
  return value === "OPEN" || value === "REVIEWED" || value === "DISMISSED";
}

export function isReportReason(value: string | null): value is ReportReason {
  return reasons.some((reason) => reason.value === value);
}

export const reasons: Array<{ value: ReportReason; label: string }> = [
  { value: "INAPPROPRIATE_CONTENT", label: "Inappropriate content" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "SPAM", label: "Spam" },
  { value: "PERSONAL_INFORMATION", label: "Personal information" },
  { value: "OTHER", label: "Other" },
];
