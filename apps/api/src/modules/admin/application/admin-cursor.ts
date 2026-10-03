export const ADMIN_CURSOR = Symbol('ADMIN_CURSOR');

export interface AdminCursorPosition {
  createdAt: Date;
  id: string;
}

export interface AdminCursorPort {
  filterHash(input: unknown): string;
  encode(input: {
    position: AdminCursorPosition;
    filterHash: string;
    size: number;
  }): string;
  decode(input: {
    cursor: string;
    filterHash: string;
    size: number;
  }): AdminCursorPosition;
}

export class InvalidAdminCursorError extends Error {
  constructor() {
    super('Invalid administrator cursor');
    this.name = 'InvalidAdminCursorError';
  }
}
