import knex from '../connection.js';

const exclusionsTableName = 'exclusions';

async function insert({playlistsSlug, formattedDate}) {
	const existingRecord = await knex(exclusionsTableName)
		.where({
			playlistsSlug,
			formattedDate
		}).first();

	if (existingRecord) {
		throw new Error('This exclusion rule already exists', existingRecord);
	}

	return knex(exclusionsTableName).insert({
		playlistsSlug,
		formattedDate
	});
}

async function remove({playlistsSlug, formattedDate}) {
	return knex(exclusionsTableName).where({
		playlistsSlug,
		formattedDate
	}).del();
}

async function getExclusionsByPlaylistsSlug(slug) {
	const results = await knex.select('formattedDate')
		.where('playlistsSlug', slug)
		.from(exclusionsTableName);
	const usefulProperties = results.map(({formattedDate}) => formattedDate);
	return new Set(usefulProperties);
}

const exports = {
	insert,
	remove,
	getExclusionsByPlaylistsSlug
};

export default exports;
