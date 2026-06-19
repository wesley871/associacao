import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import distribuicaoRouter from '../modules/distribuicao/router/distribuicao.router.js';
import familiaRouter from '../modules/familia/router/familia.router.js';
import { protectedHomeRouter, publicHomeRouter } from '../modules/home/router/home.router.js';
import projetoRouter from '../modules/projeto/router/projeto.router.js';
import { protectedUserRouter, publicUserRouter } from '../modules/user/router/user.router.js';

const router = Router();

router.use(publicHomeRouter)
router.use(publicUserRouter)

router.use(requireAuth)

router.use(protectedHomeRouter)
router.use(protectedUserRouter)
router.use(familiaRouter)
router.use(projetoRouter)
router.use(distribuicaoRouter)

export default router;
