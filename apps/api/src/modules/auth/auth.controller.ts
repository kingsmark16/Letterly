import type { Request, Response } from 'express';
import { All, Controller, Req, Res } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './infrastructure/better-auth';

const authHandler = toNodeHandler(auth);

@Controller()
export class AuthController {
  @All('api/auth/*path')
  async handle(@Req() request: Request, @Res() response: Response) {
    await authHandler(request, response);
  }
}
