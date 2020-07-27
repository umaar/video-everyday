exports.up = function (knex) {
	return knex.schema.createTable('choices', table => {
		table.increments();

		table.integer('mediaMetadataID')
			.references('id')
			.inTable('mediaMetadata')
			.onUpdate('CASCADE')
			.onDelete('CASCADE');

		table.integer('playlistsSlug')
			.references('slug')
			.inTable('playlists')
			.onUpdate('CASCADE')
			.onDelete('CASCADE');
	});
};

exports.down = function (knex) {
	return knex.schema.dropTable('choices');
};
