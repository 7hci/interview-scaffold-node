import { v4 as uuid } from 'uuid';

import { getJumperById, insertJumper, JumperDb } from '../../src/models/jumper';
import { withResources } from '../util';

describe('models/jumper', () => {
	it(
		'should be able to create and get a jumper',
		withResources(async ({ db }) => {
			const [name, username] = [uuid(), uuid()];

			const jumper = await insertJumper(db, {
				name,
				username,
			});

			const verify = (record: JumperDb) => {
				expect(record).toMatchObject(
					expect.objectContaining<Partial<JumperDb>>({
						jumperId: expect.any(Number),
						jumps: 0,
						name,
						username,
						firstJumpedAt: null,
						recordCreated: expect.any(Date),
					})
				);
			};
			verify(jumper);

			const jumper2 = await getJumperById(db, jumper.jumperId);
			verify(jumper2);
		})
	);
});
