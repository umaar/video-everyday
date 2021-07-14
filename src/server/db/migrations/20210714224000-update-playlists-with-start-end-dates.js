exports.up = function (knex) {
	return knex.schema.table('playlists', table => {
		table.timestamp('startDate');
		table.timestamp('endDate');
	});
};

exports.down = function (knex) {
	return knex.schema.table('playlists', table => {
		table.dropColumn('startDate');
		table.dropColumn('endDate');
	});
};
