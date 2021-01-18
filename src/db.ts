import Bluebird, { Disposer } from 'bluebird';

import { DBPool, DBPoolClient } from './resources';

/**
 * A postgres client used
 */
export interface TxClient extends DBPoolClient {
	activeTx: boolean;
}

/**
 * A function which runs within a DB transaction
 */
export interface FnUsingTxClient<Out> {
	(client: TxClient): Promise<Out> | PromiseLike<Out>;
}

/**
 * Basic DB access method
 * which can support queries against the pool or
 * a specific client associated to an active transaction
 */
export type DB = TxClient | DBPool;

/**
 * Manage client from DB pool using disposer pattern
 */
function getClient(pool: DBPool): Disposer<DBPoolClient> {
	return Bluebird.resolve(pool)
		.then((p) => p.connect())
		.disposer((c) => c.release());
}

function isTxClient(db: DB): db is TxClient {
	return (db as TxClient).activeTx;
}

/**
 * Run provided function within a transaction
 */
export async function usingTransaction<Out>(
	db: DB,
	fnUsingTxClient: FnUsingTxClient<Out>
): Promise<Out> {
	if (isTxClient(db)) {
		// allow code to run in existing transaction
		return fnUsingTxClient(db);
	}
	// begin a new transaction
	const out = await Bluebird.using(getClient(db), async (client) => {
		const txClient = Object.assign(client, { activeTx: true });
		try {
			await txClient.query('BEGIN');
			const results = await fnUsingTxClient(txClient);
			await txClient.query('COMMIT');
			return results;
		} catch (err) {
			await txClient.query('ROLLBACK');
			throw err;
		} finally {
			txClient.activeTx = false;
		}
	});
	return out;
}
