import { getResourcesOnly, Resources } from '../src/resources';

/* A type that represents the remaining parameters of a function after the first. */
export type RestParameters<T extends (...args: any[]) => any> = T extends (
	arg1: any,
	...args: infer Q
) => any
	? Q
	: never;

// whether or not beforeAll/afterAll hooks have been injected for resource management
let resourceSetupCompleted = 0;
let resourcesInstance: Resources | null;

function getResources(): Resources {
	if (!resourcesInstance) {
		throw new Error('Resources not established.  Delcare dbInit() first.');
	}
	return resourcesInstance;
}

// inialize before/after hooks to create the Resources. This works under the underlying assumption
// that this will be called from test files that are run via jest in which each test file runs in
// it's own sandboxed node vm envrionment (such that resourceSetupCompleted and resourcesInstance
// will always start out as 0/undefined)
function dbInit(): void {
	resourceSetupCompleted += 1;

	beforeAll(async () => {
		if (!resourcesInstance) {
			resourcesInstance = await getResourcesOnly();
		}
	});

	afterAll(async () => {
		resourceSetupCompleted -= 1;
		if (resourceSetupCompleted === 0) {
			if (resourcesInstance) {
				await resourcesInstance.db.end();
				resourcesInstance = null;
			}
		}
	});
}

export function withResources<T extends (resources: Resources, ...args: unknown[]) => Promise<any>>(
	fn: T
): (...args: RestParameters<T>) => Promise<ReturnType<T>> {
	dbInit();
	return async (...args: RestParameters<T>) => fn(getResources(), ...args);
}
