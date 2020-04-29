import config from 'config';

const environment = config.get('environment');

const knexConfig = {
	client: 'sqlite3',
	connection: () => ({
		filename: `./db-${environment}-video-everyday.sqlite`
	}),
	migrations: {
		directory: './src/server/db/migrations'
	},
	seeds: {
		directory: `./src/server/db/seeds`
	},
	useNullAsDefault: true
};

export const {
	client,
	connection,
	migrations,
	seeds,
	useNullAsDefault
} = knexConfig;