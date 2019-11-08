(async function () {
	'use strict';

	const logger = require('./logger');

	logger.info('App Starting...');
	const config = require('config');
	const app = require('./app');

	const prepareMedia = require('./lib/prepare-media.js');

	const debug = require('debug')('herman-express:server');
	const http = require('http');

	try {
		await prepareMedia();
	} catch (err) {
		console.log('Nooo there was an error, ', err);
		throw Error(err)
	}
	const port = normalizePort(config.get('port'));
	logger.info('[System Environment]: ', config.get('environment'));
	app.set('port', port);


	const server = http.createServer(app);

	server.listen(port);
	server.on('error', onError);
	server.on('listening', onListening);

	function normalizePort(val) {
		const port = parseInt(val, 10);
		if (isNaN(port)) {
			return val;
		}

		if (port >= 0) {
			return port;
		}

		return false;
	}

	function onError(error) {
		if (error.syscall !== 'listen') {
			throw error;
		}

		const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;
		switch (error.code) {
			case 'EACCES':
				console.error(bind + ' requires elevated privileges');
				process.exit(1);
				break;
			case 'EADDRINUSE':
				console.error(bind + ' is already in use');
				process.exit(1);
				break;
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
})();
