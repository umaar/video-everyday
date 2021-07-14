import slugify from 'slugify';
import knex from '../connection.js';

const playlistsTableName = 'playlists';

async function getAllPlaylists() {
	return knex.select('*').from(playlistsTableName);
}

async function insert(playlistName) {
	return knex(playlistsTableName).insert({
		name: playlistName,
		slug: slugify(playlistName)
	});
}

async function update({newPlaylistName, oldSlug, newStartDate, newEndDate}) {
	return knex(playlistsTableName)
		.update({
			name: newPlaylistName,
			slug: slugify(newPlaylistName),
			startDate: newStartDate,
			endDate: newEndDate,
			updated_at: new Date().toISOString() // eslint-disable-line camelcase
		})
		.where('slug', oldSlug);
}

async function getPlaylistBySlug(slug) {
	return knex(playlistsTableName)
		.where('slug', slug)
		.first();
}

const exports = {
	insert,
	getAllPlaylists,
	update,
	getPlaylistBySlug
};

export default exports;
