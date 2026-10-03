import { pageIdParamsSchema } from "@letterly/contracts/pages";
import {
  createPageQuestionRequestSchema,
  deletePageQuestionRequestSchema,
  pageQuestionDeleteResponseSchema,
  pageQuestionListResponseSchema,
  pageQuestionMutationResponseSchema,
  pageQuestionReorderResponseSchema,
  questionIdParamsSchema,
  reorderPageQuestionsRequestSchema,
  updatePageQuestionRequestSchema,
  type CreatePageQuestionRequest,
  type DeletePageQuestionRequest,
  type PageQuestion,
  type ReorderPageQuestionsRequest,
  type UpdatePageQuestionRequest,
} from "@letterly/contracts/questions";
import { apiClient, request } from "../../../lib/api/transport";

export async function listPageQuestions(
  pageId: string,
): Promise<PageQuestion[]> {
  const params = pageIdParamsSchema.shape.pageId.parse(pageId);
  return request(
    () => apiClient.get(`/pages/${params}/questions`),
    pageQuestionListResponseSchema,
  );
}

export async function createPageQuestion(
  pageId: string,
  input: CreatePageQuestionRequest,
): Promise<{ question: PageQuestion; contentVersion: number }> {
  const params = pageIdParamsSchema.shape.pageId.parse(pageId);
  const payload = createPageQuestionRequestSchema.parse(input);
  return request(
    () => apiClient.post(`/pages/${params}/questions`, payload),
    pageQuestionMutationResponseSchema,
  );
}

export async function updatePageQuestion(
  pageId: string,
  questionId: string,
  input: UpdatePageQuestionRequest,
): Promise<{ question: PageQuestion; contentVersion: number }> {
  const params = questionIdParamsSchema.parse({ pageId, questionId });
  const payload = updatePageQuestionRequestSchema.parse(input);
  return request(
    () =>
      apiClient.patch(
        `/pages/${params.pageId}/questions/${params.questionId}`,
        payload,
      ),
    pageQuestionMutationResponseSchema,
  );
}

export async function deletePageQuestion(
  pageId: string,
  questionId: string,
  input: DeletePageQuestionRequest,
): Promise<{ deleted: true; contentVersion: number }> {
  const params = questionIdParamsSchema.parse({ pageId, questionId });
  const payload = deletePageQuestionRequestSchema.parse(input);
  return request(
    () =>
      apiClient.delete(
        `/pages/${params.pageId}/questions/${params.questionId}`,
        { data: payload },
      ),
    pageQuestionDeleteResponseSchema,
  );
}

export async function reorderPageQuestions(
  pageId: string,
  input: ReorderPageQuestionsRequest,
): Promise<{ questionIds: string[]; contentVersion: number }> {
  const params = pageIdParamsSchema.shape.pageId.parse(pageId);
  const payload = reorderPageQuestionsRequestSchema.parse(input);
  return request(
    () => apiClient.patch(`/pages/${params}/questions/order`, payload),
    pageQuestionReorderResponseSchema,
  );
}
