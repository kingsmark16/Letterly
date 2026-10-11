import type { ListSubmissionsInput } from '../application/page-submissions.repository';

export function buildSubmissionSummaryQuery(input: ListSubmissionsInput) {
  const values: Array<string | number | Date> = [input.pageId];
  const conditions = [`s."pageId" = $1::uuid`, `s."deletedAt" IS NULL`];
  if (input.filter === 'unread') conditions.push(`s."readState" = 'UNREAD'`);
  if (input.cursor) {
    values.push(input.cursor.submittedAt, input.cursor.id);
    conditions.push(`(s."submittedAt", s."id") < ($2::timestamp, $3::uuid)`);
  }
  values.push(input.size + 1);
  return {
    text: `
      WITH selected AS MATERIALIZED (
        SELECT s."id", s."readState", s."submittedAt", s."journeyAnswerCount"
        FROM "VisitorSubmission" s
        WHERE ${conditions.join(' AND ')}
        ORDER BY s."submittedAt" DESC, s."id" DESC
        LIMIT $${values.length}::integer
      )
      SELECT selected.*,
        answers."answerCount",
        COALESCE(message."present", FALSE) AS "hasVisitorMessage",
        CASE WHEN selected."journeyAnswerCount" IS NULL AND answers."answerCount" = 0
          THEN (SELECT legacy."journeySnapshot" FROM "VisitorSubmission" legacy WHERE legacy."id" = selected."id")
          ELSE NULL END AS "legacyJourneySnapshot"
      FROM selected
      CROSS JOIN LATERAL (
        SELECT COUNT(*)::integer AS "answerCount"
        FROM "VisitorAnswer" answer WHERE answer."submissionId" = selected."id"
      ) answers
      LEFT JOIN LATERAL (
        SELECT TRUE AS "present" FROM "VisitorMessage" message
        WHERE message."submissionId" = selected."id" LIMIT 1
      ) message ON TRUE
      ORDER BY selected."submittedAt" DESC, selected."id" DESC
    `,
    values,
  };
}
