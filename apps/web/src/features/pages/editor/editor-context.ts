import type { OwnerPageProjection } from "@letterly/contracts/pages";
import type { UseQueryResult } from "@tanstack/react-query";
import type { WebApiError } from "../../../lib/api-client";
export interface PageEditorProps {
  pageQuery: UseQueryResult<OwnerPageProjection, WebApiError> & {
    data: OwnerPageProjection;
  };
}
