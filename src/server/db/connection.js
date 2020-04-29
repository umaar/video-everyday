import knex from 'knex';
// @ts-ignore
import * as knexConfig from '../../../knexfile.mjs';

const DBConnection = knex(knexConfig);

export default DBConnection;
