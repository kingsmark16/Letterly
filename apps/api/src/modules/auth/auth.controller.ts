import type { Response } from 'express';
import { All, Controller, Req, Res } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import {
  getRequestId,
  type RequestWithContext,
} from '../../infrastructure/http/request-context';
import { auth } from './infrastructure/better-auth';

const authHandler = toNodeHandler(auth);
const canonicalClientIpHeader = 'x-letterly-client-ip';
const forwardedClientIpHeaders = [
  'cf-connecting-ip',
  'x-forwarded-for',
  'x-real-ip',
  canonicalClientIpHeader,
] as const;

function canonicalizeClientIp(request: RequestWithContext): void {
  const clientIp = request.ip;

  for (const header of forwardedClientIpHeaders) {
    delete request.headers[header];
  }

  if (clientIp) {
    request.headers[canonicalClientIpHeader] = clientIp;
  }
}

@Controller()
export class AuthController {
  @All('api/auth/*path')
  async handle(@Req() request: RequestWithContext, @Res() response: Response) {
    const requestId = getRequestId(request, response);
    request.headers['x-request-id'] = requestId;
    canonicalizeClientIp(request);
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    await authHandler(request, response);
  }
}
