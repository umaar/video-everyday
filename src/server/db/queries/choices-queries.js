import knex from '../connection.js';

const choicesTableName = 'choices';

async function test() {
	return knex(choicesTableName).select(
		`${choicesTableName}.*`,
		'playlists.slug'
	)
		.join('playlists', {[
		`${choicesTableName}.playlists_id`]: 'playlists.id'
		});
}

const exports = {

};

export default exports;
