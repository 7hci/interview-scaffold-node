import { DB } from '../db';

export interface JumperDb {
	jumperId: number;
	username: string;
	name: string;
	jumps: number;
	firstJumpedAt?: Date | null;
	recordCreated: Date;
	recordUpated: Date;
}

export type JumperDbInsert = Pick<JumperDb, 'name' | 'username'> & Partial<JumperDb>;

export async function insertJumper(db: DB, fields: JumperDbInsert): Promise<JumperDb> {
	const result = await db.sql`
		INSERT INTO jumpers (
			username,
			name,
			jumps,
			first_jumped_at,
			record_created,
			record_updated
		) VALUES (
			${fields.username},
			${fields.name},
			COALESCE(${fields.jumps}, 0),
			${fields.firstJumpedAt},
			COALESCE(${fields.recordCreated}, CURRENT_TIMESTAMP(3)),
			COALESCE(${fields.recordUpated}, CURRENT_TIMESTAMP(3))
		) RETURNING
			jumper_id AS "jumperId",
			username,
			name,
			jumps,
			first_jumped_at AS "firstJumpedAt",
			record_created AS "recordCreated",
			record_updated AS "recordUpdated"
		`;

	return result.rows[0];
}

export async function getJumperById(db: DB, id: number): Promise<JumperDb> {
	const { rowCount, rows } = await db.sql`
		SELECT
			jumper_id AS "jumperId",
			username,
			name,
			jumps,
			first_jumped_at AS "firstJumpedAt",
			record_created AS "recordCreated",
			record_updated AS "recordUpdated"
		FROM
			jumpers
		WHERE
			jumper_id = ${id}
	`;

	if (rowCount === 0) {
		throw new Error('not found');
	}
	return rows[0];
}

export async function getJumpers(
	db: DB,
	pageSize: number,
	offset = 0
): Promise<(JumperDb & { jumpersCount: number })[]> {
	const { rows } = await db.sql`
		WITH cte AS (
			SELECT *
			FROM jumpers
		),
		jumpers_count AS (SELECT count(*) FROM cte)
		SELECT 
			jumper_id AS "jumperId",
			username,
			name,
			jumps,
			first_jumped_at AS "firstJumpedAt",
			record_created AS "recordCreated",
			record_updated AS "recordUpdated",
			(SELECT count FROM jumpers_count) AS "jumpersCount"
		FROM
			cte
		ORDER BY jumper_id DESC
		LIMIT ${pageSize}
		OFFSET ${offset}
	`;
	return rows;
}

export async function incrementJump(db: DB, jumperId: number): Promise<number> {
	const { rows } = await db.sql`
		UPDATE jumpers
		SET
			jumps = jumps + 1,
			first_jumped_at = COALESCE(first_jumped_at, CURRENT_TIMESTAMP(3))
		WHERE jumper_id = ${jumperId}
		RETURNING (
			jumps
		)
	`;
	return rows[0].jumps;
}
