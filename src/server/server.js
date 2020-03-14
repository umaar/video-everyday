import http from 'http';
import debug from 'debug';

import config from 'config';
import logger from './logger.js';

import prepareMedia from './lib/prepare-media.js';

import app from './app.js';

function normalizePort(value) {
	const port = parseInt(value, 10);
	if (isNaN(port)) {
		return value;
	}

	if (port >= 0) {
		return port;
	}

	return false;
}

async function init() {
	logger.info('App Starting…');
	debug('herman-express:server');

	try {
		await prepareMedia();
	} catch (error) {
		console.log('Error preparing media: ', error);
		throw new Error(error);
	}

	const port = normalizePort(config.get('port'));
	logger.info('[System Environment]: ', config.get('environment'));
	app.set('port', port);

	const server = http.createServer(app);

	server.listen(port);
	server.on('error', onError);
	server.on('listening', onListening);

	function onError(error) {
		if (error.syscall !== 'listen') {
			throw error;
		}

		const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;
		switch (error.code) {
			case 'EACCES':
				console.error(bind + ' requires elevated privileges');
				throw new Error('Error making server: EACCES');
			case 'EADDRINUSE':
				console.error(bind + ' is already in use');
				throw new Error('Error making server: EADDRINUSE');
			default:
				throw error;
		}
	}

	function onListening() {
		const addr = server.address();
		const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
		debug('Listening on ' + bind);
		logger.info(`[URL]: ${config.get('domain')}`);
	}
}

init();
