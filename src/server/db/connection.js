import config from 'config';
import knex from 'knex';
import knexConfig from '../../../knexfile.js';

export default knex(knexConfig[config.get('environment')])