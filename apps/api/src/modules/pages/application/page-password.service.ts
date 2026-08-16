import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { SecretLetterEncryptedPassword } from '@letterly/templates';
import {
  hashUnlockToken,
  readUnlockTokenFromHeader,
  createUnlockToken,
} from '../../../infrastructure/http/unlock-cookie';
import {
  PAGE_PASSWORD_REPOSITORY,
  type PagePasswordRepository,
} from './page-password.repository';
import {
  UNLOCK_PROOF_STORE,
  type UnlockProofStore,
} from './unlock-proof.store';

export const PAGE_PASSWORD_ENCRYPTION_KEY = Symbol(
  'PAGE_PASSWORD_ENCRYPTION_KEY',
);
export const PAGE_PASSWORD_ENCRYPTION_KEY_VERSION = Symbol(
  'PAGE_PASSWORD_ENCRYPTION_KEY_VERSION',
);

export const UNLOCK_PROOF_TTL_SECONDS = 24 * 60 * 60;

export class PagePasswordNotFoundError extends Error {
  constructor() {
    super('This letter is not available');
    this.name = 'PagePasswordNotFoundError';
  }
}

export class InvalidPagePasswordError extends Error {
  constructor() {
    super('The password is incorrect');
    this.name = 'InvalidPagePasswordError';
  }
}

export class PagePasswordConfigurationError extends Error {
  constructor() {
    super('Page password protection is unavailable');
    this.name = 'PagePasswordConfigurationError';
  }
}

@Injectable()
export class PagePasswordService {
  constructor(
    @Inject(PAGE_PASSWORD_REPOSITORY)
    private readonly repository: PagePasswordRepository,
    @Inject(UNLOCK_PROOF_STORE)
    private readonly proofStore: UnlockProofStore,
    @Optional()
    @Inject(PAGE_PASSWORD_ENCRYPTION_KEY)
    private readonly encryptionKey?: string,
    @Optional()
    @Inject(PAGE_PASSWORD_ENCRYPTION_KEY_VERSION)
    private readonly encryptionKeyVersion = '1',
  ) {}

  async setPassword(input: {
    creatorId: string;
    pageId: string;
    password: string | null;
  }): Promise<{ passwordProtected: boolean }> {
    const encrypted =
      input.password === null ? null : this.encrypt(input.password);
    const result = await this.repository.setOwnedPassword({
      creatorId: input.creatorId,
      pageId: input.pageId,
      password: encrypted,
    });

    if (result === 'not_found') {
      throw new PagePasswordNotFoundError();
    }

    await this.invalidatePageProofs(input.pageId);

    return { passwordProtected: encrypted !== null };
  }

  async invalidatePageProofs(pageId: string): Promise<void> {
    try {
      await this.proofStore.revoke(pageId, UNLOCK_PROOF_TTL_SECONDS);
    } catch {
      throw new PagePasswordConfigurationError();
    }
  }

  async findPublicProtection(
    slug: string,
  ): Promise<{ pageId: string; passwordVersion: string } | null> {
    const result = await this.repository.findPublishedPassword(
      slug.trim().toLowerCase(),
    );
    if (!result) {
      return null;
    }

    return {
      pageId: result.pageId,
      passwordVersion: result.password.passwordVersion,
    };
  }

  async unlock(
    slug: string,
    password: string,
  ): Promise<{ pageId: string; token: string }> {
    const result = await this.repository.findPublishedPassword(
      slug.trim().toLowerCase(),
    );
    if (!result) {
      throw new PagePasswordNotFoundError();
    }

    let expectedPassword: string;
    try {
      expectedPassword = this.decrypt(result.password);
    } catch (error: unknown) {
      if (error instanceof PagePasswordConfigurationError) {
        throw error;
      }
      throw new PagePasswordConfigurationError();
    }

    const provided = Buffer.from(password, 'utf8');
    const expected = Buffer.from(expectedPassword, 'utf8');
    if (
      provided.length !== expected.length ||
      !timingSafeEqual(provided, expected)
    ) {
      throw new InvalidPagePasswordError();
    }

    const token = createUnlockToken();
    try {
      await this.proofStore.set(
        this.proofKey(result.pageId, token),
        JSON.stringify({
          passwordVersion: result.password.passwordVersion,
          issuedAt: Date.now(),
        }),
        UNLOCK_PROOF_TTL_SECONDS,
      );
    } catch {
      throw new PagePasswordConfigurationError();
    }
    return { pageId: result.pageId, token };
  }

  async verifyRequestCookie(
    pageId: string,
    passwordVersion: string,
    cookieHeader: string | undefined,
  ): Promise<boolean> {
    const token = readUnlockTokenFromHeader(cookieHeader, pageId);
    if (!token) {
      return false;
    }

    try {
      const rawProof = await this.proofStore.get(this.proofKey(pageId, token));
      if (!rawProof) {
        return false;
      }
      const proof: unknown = JSON.parse(rawProof);
      if (
        typeof proof !== 'object' ||
        proof === null ||
        !('passwordVersion' in proof) ||
        !('issuedAt' in proof) ||
        typeof proof.passwordVersion !== 'string' ||
        typeof proof.issuedAt !== 'number'
      ) {
        return false;
      }
      const revokedAt = await this.proofStore.get(`unlock:revoked:${pageId}`);
      return (
        proof.passwordVersion === passwordVersion &&
        (!revokedAt || proof.issuedAt > Number(revokedAt))
      );
    } catch {
      throw new PagePasswordConfigurationError();
    }
  }

  private encrypt(password: string): SecretLetterEncryptedPassword {
    const key = this.getKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(password, 'utf8'),
      cipher.final(),
    ]);

    return {
      ciphertext: ciphertext.toString('base64url'),
      iv: iv.toString('base64url'),
      authTag: cipher.getAuthTag().toString('base64url'),
      keyVersion: this.encryptionKeyVersion,
      passwordVersion: randomBytes(16).toString('hex'),
    };
  }

  private decrypt(password: SecretLetterEncryptedPassword): string {
    if (password.keyVersion !== this.encryptionKeyVersion) {
      throw new PagePasswordConfigurationError();
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.getKey(),
      Buffer.from(password.iv, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(password.authTag, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(password.ciphertext, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  private getKey(): Buffer {
    if (!this.encryptionKey) {
      throw new PagePasswordConfigurationError();
    }
    return createHash('sha256').update(this.encryptionKey, 'utf8').digest();
  }

  private proofKey(pageId: string, token: string): string {
    return `unlock:${pageId}:${hashUnlockToken(token)}`;
  }
}
