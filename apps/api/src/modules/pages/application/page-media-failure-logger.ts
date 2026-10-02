export const PAGE_MEDIA_FAILURE_LOGGER = Symbol('PAGE_MEDIA_FAILURE_LOGGER');

export interface PageMediaFailureEvent {
  event: 'image_completion_failed';
  stage: string;
  imageId: string;
  errorCode?: string;
  errorName?: string;
  statusCode?: number;
}

export interface PageMediaFailureLogger {
  error: (event: PageMediaFailureEvent) => void;
}
