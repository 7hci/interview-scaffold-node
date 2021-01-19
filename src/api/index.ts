import { Router } from 'express';

import jumpers from './jumpers';

const api = Router({
	mergeParams: true,
});

api.use('/jumpers', jumpers);

export default api;
