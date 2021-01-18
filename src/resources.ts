/* eslint-disable @typescript-eslint/no-explicit-any */
import Bluebird, { Disposer } from 'bluebird';
import { Client, Pool, PoolClient, QueryConfig, QueryResult } from 'pg';

import config from './config';

interface TaggedTemplateSQL {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	<T = any>(parts: TemplateStringsArray, ...values: any[]): Promise<QueryResult<T>>;
}

/**
 * Pool extended with sql`SQL CODE` tagged template method
 */
export interface DBPoolClient extends PoolClient {
	sql: TaggedTemplateSQL;
}

/**
 * DBPool extended with sql`SQL CODE` tagged template method
 */
export interface DBPool extends Pool {
	sql: TaggedTemplateSQL;
	connect: () => Promise<DBPoolClient>;
}

/**
 * Any object that can execute a query (pool or client)
 */
interface DBQueryable {
	query: (queryConfig: QueryConfig) => Promise<QueryResult>;
}

/**
 * Globally managed resources
 */
export interface Resources {
	db: DBPool;
	// redis
}

/**
 * Converts SQL string tagged template to QueryConfig
 */
function sqlLiteral(parts: TemplateStringsArray, values: any[]): { text: string; values: any[] } {
	const text = parts.reduce((acc, s, i) => `${acc}$${i}${s}`);
	return { text, values };
}

/**
 * Executes SQL string tagged template using this.query() method
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sql<T = any>(
	this: DBQueryable,
	parts: TemplateStringsArray,
	...values: any[]
): Promise<QueryResult<T>> {
	const queryConfig = sqlLiteral(parts, values);
	return this.query(queryConfig);
}

// Provide client.sql`SQL CODE` method
Object.assign(Client.prototype, { sql });
Object.assign(Pool.prototype, { sql });

export function getResources(): Disposer<Resources> {
	const pool = new Pool(config.postgres) as DBPool;
	const resources: Resources = { db: pool };
	return Bluebird.resolve(resources)
		.tap(async ({ db }) => {
			const client = await db.connect();
			client.release();
		})
		.disposer(async ({ db }) => {
			await db.end();
		});
}

export async function getResourcesOnly(): Promise<Resources> {
	const pool = new Pool(config.postgres) as DBPool;
	const resources: Resources = { db: pool };
	const client = await pool.connect();
	client.release();
	return resources;
}
