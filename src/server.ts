import http from 'http';
import url, { URL } from 'url';
import { promisify } from 'util';

import express, { ErrorRequestHandler } from 'express';
import Bluebird from 'bluebird';

import config from './config';
import logger from './logger';
import { getResources, Resources } from './resources';
import apiRouter from './api';

export interface WebServerWorker {
	listen: (port?: number) => Promise<http.Server>;
	close: () => Promise<void>;
	server: http.Server;
}

export function createServer(resources: Resources): Readonly<WebServerWorker> {
	const app = express();

	// app.enable('case sensitive routing');
	// app.enable('strict routing');

	app.use((req, _, next) => {
		req.context = { resources };
		next();
	});

	app.use('/api', apiRouter);

	const errorHandler: ErrorRequestHandler = (err, req, res, next): void => {
		/* istanbul ignore next: ignore testing the trivial defaults */
		const { status = 500, message = 'Internal Service Error' } = err;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(res as any).originalError = err;

		res.status(status).send({ error: message });
		logger.error(req.method, req.originalUrl, err.stack, message);
		next(err);
	};
	app.use(errorHandler);

	const server = http.createServer(app);

	function listen(port = config.port): Promise<http.Server> {
		return new Promise((resolve, reject) => {
			server.once('error', reject);
			server.listen(port, () => {
				server.removeListener('error', reject);

				const serverUrl = new URL(config.baseUrl);
				serverUrl.port = port.toString();

				logger.info('Listening on', url.format(serverUrl));

				resolve(server);
			});
		});
	}

	function close(): Promise<void> {
		return promisify(server.close.bind(server))();
	}

	return Object.freeze({
		server,
		listen,
		close,
	});
}

function initServer(resources: Resources): Bluebird.Disposer<void> {
	return Bluebird.resolve(createServer(resources))
		.tap((server) => server.listen(config.port))
		.disposer((server) => server.close());
}

export default class WebServer {
	private emitter: NodeJS.EventEmitter;

	public constructor(emitter = process) {
		this.emitter = emitter;
	}

	public run(): Promise<void> {
		const events = ['SIGINT', 'SIGTERM', 'uncaughtException', 'unhandledRejection'];

		return Bluebird.using(getResources(), async (resources) => {
			return Bluebird.using(initServer(resources), () => {
				return new Promise((resolve) => {
					const eventHandler = (err?: NodeJS.Signals | Error): void => {
						/* istanbul ignore else */
						if (err === 'SIGTERM' || err === 'SIGINT') {
							logger.info('Shutting down', err);
						} else {
							logger.error(err);
						}
						resolve();
					};
					events.forEach((event) => this.emitter.once(event, eventHandler));
				});
			});
		});
	}
}
