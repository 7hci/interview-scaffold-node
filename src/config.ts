import path from 'path';

import UAConfig from 'ua-config';
import {
	Boolean,
	Literal,
	Number,
	Record,
	Static,
	String,
	Undefined,
	ValidationError,
} from 'runtypes';
import CheckFilter from 'runtypes-filter';

const PoolConfig = Record({
	host: String,
	port: Number,
	user: String,
	password: String,
	database: String,
	ssl: Boolean,
	// Config option passed to external library
	// eslint-disable-next-line @typescript-eslint/naming-convention
	statement_timeout: Number.Or(Literal(false)),
	connectionTimeoutMillis: Number,
	idleTimeoutMillis: Number,
	max: Number,
});

const Config = Record({
	baseUrl: String,
	port: Number,
	postgres: PoolConfig,
	NODE_ENV: String.Or(Undefined),
});

type Config = Static<typeof Config>;

const filterConfig = CheckFilter(Config);

export function getConfig(): Config {
	try {
		return filterConfig(UAConfig(path.join(__dirname, '../config')).get());
	} catch (e) {
		// uncaught exception will end program
		/* istanbul ignore else */
		if (e instanceof ValidationError) {
			const { name, key, message } = e;
			// eslint-disable-next-line no-console
			console.error(`Invalid configuration - ${name}: ${key} - ${message}`);
		}
		throw e;
	}
}
export default getConfig();
