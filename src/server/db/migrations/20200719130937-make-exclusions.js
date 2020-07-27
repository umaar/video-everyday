exports.up = function (knex) {
	return knex.schema.createTable('exclusions', table => {
		table.increments();

		table.string('formattedDate').notNullable();

		table.string('playlistsSlug')
			.references('slug')
			.inTable('playlists')
			.onUpdate('CASCADE')
			.onDelete('CASCADE');
	});
};

exports.down = function (knex) {
	return knex.schema.dropTable('exclusions');
};
