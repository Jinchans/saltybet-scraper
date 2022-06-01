
exports.up = function(knex) {
  return knex.schema
    .createTable('fighters', table => {
      table.increments('id');
      table.string('name').notNullable();
      table.integer('wins').defaultTo(0);
      table.integer('losses').defaultTo(0);
      table.integer('matches').defaultTo(0);
      table.integer('tournament_match_wins').defaultTo(0);
      table.integer('tournament_match_losses').defaultTo(0);
      table.integer('tournament_matches').defaultTo(0);
      table.integer('tournament_final_wins').defaultTo(0);
      table.integer('favor').defaultTo(0);
      table.timestamps(true, true);
    })
    .createTable('matches', table => {
      table.increments('id');
      table.string('red_fighter');
      table.string('blue_fighter');
      table.integer('red_bets').defaultTo(0);
      table.integer('blue_bets').defaultTo(0);
      table.string('match_winner');
      table.string('match_type');
      table.string('match_time');
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('fighters')
    .dropTable('matches');
};
