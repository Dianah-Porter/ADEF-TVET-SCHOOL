import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/requireAuth';
import { loginRateLimit } from '../../middleware/rateLimit';
import { loginSchema } from './auth.schema';
import * as controller from './auth.controller';

export const authRouter = Router();

authRouter.post('/login', loginRateLimit, validate({ body: loginSchema }), controller.loginHandler);
authRouter.post('/refresh', controller.refreshHandler);
authRouter.post('/logout', controller.logoutHandler);
authRouter.get('/me', requireAuth, controller.meHandler);
