exports.up = function (knex) {
	return knex.schema.createTable('playlists', table => {
		table.increments();
		table.timestamps(undefined, true);
		table.string('name').unique().notNullable();
		table.string('slug').unique().notNullable();
	});
};

exports.down = function (knex) {
	return knex.schema.dropTable('playlists');
};
