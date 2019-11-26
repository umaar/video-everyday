const path = require('path');
const databaseName = 'video-everyday';

const migrationsDirectory = path.join(process.cwd(), '/src/server/db/migrations');
const seedsDirectory = path.join(process.cwd(), '/src/server/db/seeds');

const config = {
	development: {
		client: 'sqlite3',
		connection: {
			filename: `./db-development-${databaseName}.sqlite`
		},
		migrations: {
			directory: migrationsDirectory
		},
		seeds: {
			directory: seedsDirectory
		},
		useNullAsDefault: true
	},
	production: {
		client: 'sqlite3',
		connection: {
			filename: `./db-production-${databaseName}.sqlite`
		},
		migrations: {
			directory: migrationsDirectory
		},
		seeds: {
			directory: seedsDirectory
		}
	}
};

module.exports = config;

