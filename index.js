const express = require('express');
const request = require('request');
const parseJson = require('parse-json');

const db = require('./db/db');
const router = require('./routes');

const app = express();
const apiUrl = 'https://www.saltybet.com/state.json';
let fighterData = '';
let matchCheck = '';
let matchType = '';
let statusCheck = '';
let matchStatus = '';
let oldStatus = '';

app.use(express.json());
app.use(router);

app.listen(3000, () => {
  setInterval(dataObserver, 3000);
});

const dataObserver = () => {
  console.log(`data observer function called, match type: ${matchType}, match status: ${matchStatus}`);

  request(apiUrl, function (err, statusCode, data) {
    try {
      fightData = parseJson(data);
    } catch (error) {
      log.message('1: ' + error, "error");
    }

    matchCheck = fightData.remaining;

    statusCheck = fightData.status;

    setMatchType();

    setMatchStatus();

    if (matchStatus != oldStatus && matchType != 'Exhibition') {
      console.log(`matchStatus = ${oldStatus} (old)/${matchStatus} (new) | matchType = ${matchType}`);

      oldStatus = matchStatus;

      let redFighter = fightData.p1name;

      let blueFighter = fightData.p2name;

      let redBets = parseInt(fightData.p1total.replace(/,/g, ""));

      let blueBets = parseInt(fightData.p2total.replace(/,/g, ""));

      console.log(typeof redBets);
      console.log(`red bets is: ${redBets}`);

      console.log(typeof blueBets);
      console.log(`blue bets is: ${blueBets}`);

      switch (matchStatus) {
        case 'open':
          console.log('still open');
          break;
        case 'locked':
          console.log('still locked');
          break;
        case 'redWon':
          console.log('red won');

          (function(foo, boo) {
            setTimeout(function() {
              checkDatabase(redFighter, blueFighter);
            }, 3000);
          })(redFighter, blueFighter);

          setTimeout(function () { //Allows checkDatabase to complete before continuing
            console.log('we are inside the timeout');
            addMatch(redFighter, blueFighter, redBets, blueBets, redFighter);
            addMatchResults(redFighter, blueFighter);
            addFavor(redFighter, blueFighter, redBets, blueBets);
          }, 10000);
          break;
        case 'blueWon':
          console.log('blue won');

          (function(foo, boo) {
            setTimeout(function() {
              checkDatabase(redFighter, blueFighter);
            }, 3000);
          })(redFighter, blueFighter);

          setTimeout(function () {
            console.log('we are inside the timeout');
            addMatch(redFighter, blueFighter, redBets, blueBets, blueFighter);
            addMatchResults(blueFighter, redFighter);
            addFavor(redFighter, blueFighter, redBets, blueBets);
          }, 10000);
          break;
        default:
          log.message('Unknown match status!', "error");
          break;
      }
    }
  });
}


function setMatchType() {
  if (matchCheck.indexOf('until the next tournament!') != -1 && matchCheck.indexOf('100 more matches until the next tournament!') == -1) {
    matchType = 'Matchmaking';
  } else if (matchCheck.indexOf('bracket') != -1 && matchCheck.indexOf('16 characters are left in the bracket!') == -1 || matchCheck.indexOf('FINAL ROUND!') != -1) {
    matchType = 'Tournament';
  } else if (matchCheck.indexOf('25 exhibition matches left!') != -1) {
    matchType = 'Tournament Final';
  } else if (matchCheck.indexOf('exhibition matches left!') != -1 ||
    matchCheck.indexOf('100 more matches until the next tournament!') != -1 ||
    matchCheck.indexOf('Matchmaking mode will be activated after the next exhibition match!') != -1) {
    matchType = 'Exhibition';
  }
}

function setMatchStatus() {
  switch (statusCheck) {
    case 'open':
      matchStatus = 'open';
      break;
    case 'locked':
      matchStatus = 'locked';
      break;
    case '1':
      matchStatus = 'redWon';
      break;
    case '2':
      matchStatus = 'blueWon';
      break;
  }
}

function checkDatabase(redFighter, blueFighter) {
  console.log('checking database!');

  db.from('fighters').select('name').whereIn('name', [redFighter, blueFighter]).then(rows => {
    console.log('we are inside check database query');

    if (typeof rows[0] == 'undefined' && typeof rows[1] == 'undefined') { //Neither fighter found.
      console.log('1 else if');
      addFighterName(redFighter, blueFighter);
    } else if (typeof rows[0] != 'undefined' && typeof rows[1] != 'undefined') { //Both fighters found.
      console.log('already exists apparently');
    } else if (rows[0].name == redFighter) {  //blueFighter is not found.
      console.log('3 else if');
      addFighterName(blueFighter);
    } else if (rows[0].name == blueFighter) { //redFighter is not found.
      console.log('4 else if');
      addFighterName(redFighter);
    } else {
      console.log('database check error!');
    }
  });
}

function addFighterName(name1, name2) {
  console.log('adding fighter names');

  if (typeof name1 != 'undefined' && typeof name2 == 'undefined') {
    console.log('insert happening');

    db('fighters').insert({ name: name1 }).returning('name').then(res => {
      console.log(`${res} has been added to the database`);
    });
  } else {
    console.log('insert happening');

    db('fighters').insert({ name: name1 }, { name: name2 }).returning('name').then(res => {
      console.log(`${res} has been added to the database`);
    });
  }
}

function addMatchResults(winner, loser) {
  switch (matchType) {
    case 'Tournament Final':
      db('fighters')
        .where('name', '=', winner)
        .update({
          tournament_final_wins: db.raw('tournament_final_wins + 1'),
          tournament_match_wins: db.raw('tournament_match_wins + 1'),
          tournament_matches: db.raw('tournament_matches + 1'),
        })
        .then(res => { console.log('tournament wins incremented!'); });

      db('fighters')
        .where('name', '=', loser)
        .update({
          tournament_match_losses: db.raw('tournament_match_losses + 1'),
          tournament_matches: db.raw('tournament_matches + 1'),
        })
        .then(res => { console.log('tournament losses incremented!'); });
      break;
    case 'Tournament':
      db('fighters')
        .where('name', '=', winner)
        .update({
          tournament_match_wins: db.raw('tournament_match_wins + 1'),
          tournament_matches: db.raw('tournament_matches + 1'),
        })
        .then(res => { console.log('tournament wins incremented!'); });


      db('fighters')
        .where('name', '=', loser)
        .update({
          tournament_match_losses: db.raw('tournament_match_losses + 1'),
          tournament_matches: db.raw('tournament_matches + 1'),
        })
        .then(res => { console.log('tournament losses incremented!'); });
      break;
    case 'Matchmaking':
      db('fighters')
        .where('name', '=', winner)
        .update({
          wins: db.raw('wins + 1'),
          matches: db.raw('matches + 1'),
        })
        .then(res => { console.log('wins & matches incremented!'); });

      db('fighters')
        .where('name', '=', loser)
        .update({
          losses: db.raw('losses + 1'),
          matches: db.raw('matches + 1'),
        })
        .then(res => { console.log('wins & matches incremented!'); });
      break;
  }
}

function addMatch(redFighter, blueFighter, redBets, blueBets, winner) {
  console.log('we are inside addMatch() before query');

  let matchTime = new Date().toLocaleString();

  db('matches').insert({ red_fighter: redFighter, blue_fighter: blueFighter, red_bets: redBets, blue_bets: blueBets, match_winner: winner, match_type: matchType, match_time: matchTime }).then(res => {
    console.log('the match has been recorded in the database');
  });
}

function addFavor(redFighter, blueFighter, redBets, blueBets) {
  if (redBets > blueBets) {
    let matchOdds = (Math.round(((redBets / blueBets) * 10)) / 10);

    if (matchOdds >= 1.4) {
      db('fighters').where('name', '=', redFighter).update({ favor: db.raw('favor + 1') }).then(res => { console.log('favor updated!'); });
    }
  } else if (blueBets > redBets) {
    let matchOdds = (Math.round(((blueBets / redBets) * 10)) / 10);

    if (matchOdds >= 1.4) {
      db('fighters').where('name', '=', blueFighter).update({ favor: db.raw('favor + 1') }).then(res => { console.log('favor updated!'); });
    }
  }
}
