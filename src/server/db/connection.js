import config from 'config';
import knex from 'knex';
import knexConfig from '../../../knexfile.cjs';

const DBConnection = knex(knexConfig[config.get('environment')]);

export default DBConnection;
