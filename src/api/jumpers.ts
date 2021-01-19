import { Request, Response, Router } from 'express';

import { getJumperById, getJumpers } from '../models/jumper';

interface GetParams {
	jumperId: string;
}

interface ListParams {
	limit?: string;
	offset?: string;
}

const router = Router();

router.get('/:jumperId', async (req: Request<GetParams>, res: Response) => {
	const {
		resources: { db },
	} = req.context;
	const { jumperId } = req.params;
	const jumper = await getJumperById(db, parseInt(jumperId, 10));
	res.json(jumper);
});

router.get('/', async (req: Request<ListParams>, res: Response) => {
	const {
		resources: { db },
	} = req.context;
	const { limit, offset } = req.params;
	const pageSize = limit ? Math.min(100, parseInt(limit, 10)) : 100;
	const jumpers = await getJumpers(db, pageSize, parseInt(offset ?? '0', 10));
	res.json(jumpers);
});

export default router;
