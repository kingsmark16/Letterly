import axios from "axios";
import { toWebApiError, WebApiError } from "./errors";

const API_REQUEST_TIMEOUT_MS = 35_000;

export const apiClient = axios.create({
  baseURL: "/api/v1",
  timeout: API_REQUEST_TIMEOUT_MS,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export const publicActionClient = axios.create({
  baseURL: "/",
  timeout: API_REQUEST_TIMEOUT_MS,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export async function request<T>(
  callback: () => Promise<{ data: unknown }>,
  schema: { parse(value: unknown): T },
): Promise<T> {
  try {
    const response = await callback();
    return schema.parse(response.data);
  } catch (error: unknown) {
    if (axios.isCancel(error) || error instanceof WebApiError) {
      throw error;
    }

    throw toWebApiError(error);
  }
}
