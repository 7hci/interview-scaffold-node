import { Resources } from '../resources';

export interface Context {
	resources: Resources;
}

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Express {
		export interface Request {
			context: Context;
		}
	}
}
