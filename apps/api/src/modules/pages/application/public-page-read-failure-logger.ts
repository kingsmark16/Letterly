export const PUBLIC_PAGE_READ_FAILURE_LOGGER = Symbol(
  'PUBLIC_PAGE_READ_FAILURE_LOGGER',
);

export interface PublicPageReadFailureEvent {
  event: 'public_page_read_failed';
  stage: 'page_repository' | 'password_repository' | 'projection_validation';
  errorName: string;
  errorCode?: string;
}

export interface PublicPageReadFailureLogger {
  warn: (event: PublicPageReadFailureEvent) => void;
}
