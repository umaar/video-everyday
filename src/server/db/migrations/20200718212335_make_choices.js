exports.up = function (knex) {
	return knex.schema.createTable('choices', table => {
		table.increments();

		table.integer('mediaMetadata_id')
			.references('id')
			.inTable('mediaMetadata')
			.onUpdate('CASCADE')
			.onDelete('CASCADE');

		table.integer('playlists_id')
			.references('id')
			.inTable('playlists')
			.onUpdate('CASCADE')
			.onDelete('CASCADE');
	});
};

exports.down = function (knex) {
	return knex.schema.dropTable('choices');
};
