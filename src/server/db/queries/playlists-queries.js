import knex from '../connection.js';
import slugify from 'slugify';

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

async function update({newPlaylistName, oldSlug}) {
	return knex(playlistsTableName)
		.update({
			name: newPlaylistName,
			slug: slugify(newPlaylistName),
			updated_at: new Date().toISOString()
		})
		.where('slug', oldSlug);
}

const exports = {
	insert,
	getAllPlaylists,
	update
};

export default exports;
