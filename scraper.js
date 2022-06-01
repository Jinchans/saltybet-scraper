require("dotenv").config();
const request = require('request');
const db = require("./db");
const log = require('./log');
const parseJson = require('parse-json');

var fightData = '';
const stateUrl = 'https://www.saltybet.com/state.json';
var matchCheck = '';
var matchType = '';
var statusCheck = '';
var matchStatus = '';
var oldStatus = '';

const process = () => {
  console.log('hello!');
  setInterval(dataObserver, 3000);
}

function dataObserver() {
  console.log(`data observer function called, match type: ${matchType}, match status: ${matchStatus}`);
  request(stateUrl, function (err, statusCode, data) {
    if (err) {
      log.message(data, "debug");
      log.message('0: ' + err.message, "error");
    } else {
      try {
        fightData = parseJson(data);
      } catch (error) {
        log.message('1: ' + error, "error");
      }
      matchCheck = fightData.remaining;
      statusCheck = fightData.status;

      setMatchType();
      setMatchStatus();
      if (matchStatus != oldStatus && matchType != 'Exhibition') { //Exhibitions are not tracked.
        console.log(`matchStatus = ${oldStatus} (old)/${matchStatus} (new) | matchType = ${matchType}`);
        oldStatus = matchStatus;
        let redFighter = fightData.p1name;
        let blueFighter = fightData.p2name;
        let redBets = fightData.p1total;
        let blueBets = fightData.p2total;
        switch (matchStatus) {
          case 'open':
            console.log('still open');
            break;
          case 'locked':
            console.log('still locked');
            break;
          case 'redWon':
            console.log('red won');

            setTimeout(() => {
              console.log('inside checkDatabase timeout');
              checkDatabase(redFighter, blueFighter);
            }, 10000);

            setTimeout(function () { //Allows checkDatabase to complete before continuing
              console.log('we are inside the timeout');
              addMatch(redFighter, blueFighter, redBets, blueBets, redFighter);
              addMatchResults(redFighter, blueFighter);
              addFavor(redFighter, blueFighter, redBets, blueBets);
            }, 10000);
            break;
          case 'blueWon':
            console.log('blue won');

            setTimeout(() => {
              console.log('inside checkDatabase timeout');
              checkDatabase(redFighter, blueFighter);
            }, 10000);

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
    }
  }

  )
};


function setMatchType() {
  if (matchCheck.indexOf('until the next tournament!') != -1 && matchCheck.indexOf('100 more matches until the next tournament!') == -1) {
    matchType = 'Matchmaking';
  } else if (matchCheck.indexOf('bracket') != -1 && matchCheck.indexOf('16 characters are left in the bracket!') == -1 || matchCheck.indexOf('FINAL ROUND!') != -1) {
    matchType = 'Tournament';
  } else if (matchCheck.indexOf('25 exhibition matches left!') != -1) {
    log.message(matchType, 'debug');
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
  db.query("select redfighter from matchtable where redfighter = $1::text;", ['Noel vermillion'], (err, res) => {
    console.log(res.rows[0].redfighter);
  });
  db.query('select name from fightertable where name = any($1)', [[redFighter, blueFighter]], (err, res) => {
    console.log('we are inside check database query');
    if (err) {
      log.message('2: ' + err.message, "error");
      console.log(('2: ' + err.message, "error"));
    } else if (typeof res.rows[0] == 'undefined' && typeof res.rows[1] == 'undefined') { //Neither fighter found.
      console.log('1 else if');
      addFighterName(redFighter, blueFighter);
      log.message('Adding both fighters...', "info");
    } else if (typeof res.rows[0] != 'undefined' && typeof res.rows[1] != 'undefined') { //Both fighters found.
      console.log('already exists apparently');
      log.message(redFighter + ' already exists in the database.', "info");
      log.message(blueFighter + ' already exists in the database.', "info");
    } else if (res.rows[0].name == redFighter) {  //blueFighter is not found.
      console.log('3 else if');
      addFighterName(blueFighter);
      log.message('New Fighter, ' + blueFighter + ', is being added...', "info");
      log.message(redFighter + ' already exists in the database.', "info");
    } else if (res.rows[0].name == blueFighter) { //redFighter is not found.
      console.log('4 else if');
      addFighterName(redFighter);
      log.message('New fighter, ' + redFighter + ', is being added...', "info");
      log.message(blueFighter + ' already exists in the database.', "info");
    } else {
      console.log('database check error!');
      log.message('Database check failed!', "error");
    }
  });
}

function addFighterName(name1, name2) {
  console.log('adding fighter names');
  if (typeof name1 != 'undefined' && typeof name2 == 'undefined') {
    console.log('insert happening');
    db.query('INSERT INTO fightertable(name) VALUES ($1::text)', [name1], function (err) {
      if (err) {
        log.message('3: ' + err.message, "error");
      } else {
        log.message(name1 + ' has been added to the database.', "info");
      }
    });
  } else {
    console.log('insert happening');
    db.query('INSERT INTO fightertable(name) VALUES ($1::text), ($2::text)', [name1, name2], function (err) {
      if (err) {
        log.message('4: ' + err.message, "error");
      } else {
        log.message(name1 + ' and ' + name2 + ' have been added to the database.', "info");
      }
    });
  }
}

function addMatchResults(winner, loser) {
  switch (matchType) {
    case 'Tournament Final':
      db.query('UPDATE fightertable SET tournamentFinalWins = tournamentFinalWins + 1 WHERE name = $1::text', [winner], function (err) {
        if (err) {
          log.message('5: ' + err.message, "error");
        } else {
          log.message(winner + ' won the tournament! The database has been updated.', "info");
        }
      })
      db.query('UPDATE fightertable SET tournamentMatchWins = tournamentMatchWins + 1, tournamentMatches = tournamentMatches + 1 WHERE name = $1::text', [winner], function (err) {
        if (err) {
          log.message('6: ' + err.message, "error");
        }
      });
      db.query('UPDATE fightertable SET tournamentMatchLosses = tournamentMatchLosses + 1, tournamentMatches = tournamentMatches + 1 WHERE name = $1::text', [loser], function (err) {
        if (err) {
          log.message('7: ' + err.message, "error");
        } else {
          log.message(loser + ' lost the match! The database has been updated.', "info");
        }
      });
      break;
    case 'Tournament':
      db.query('UPDATE fightertable SET tournamentMatchWins = tournamentMatchWins + 1, tournamentMatches = tournamentMatches + 1 WHERE name = $1::text', [winner], function (err) {
        if (err) {
          log.message('8: ' + err.message, "error");
        } else {
          log.message(winner + ' won the match! The database has been updated.', "info");
        }
      });
      db.query('UPDATE fightertable SET tournamentMatchLosses = tournamentMatchLosses + 1, tournamentMatches = tournamentMatches + 1 WHERE name = $1::text', [loser], function (err) {
        if (err) {
          log.message('9: ' + err.message, "error");
        } else {
          log.message(loser + ' lost the match! The database has been updated.', "info");
        }
      });
      break;
    case 'Matchmaking':
      db.query('UPDATE fightertable SET wins = wins + 1, matches = matches + 1 WHERE name = $1::text', [winner], function (err) {
        if (err) {
          log.message('10: ' + err.message, "error");
        } else {
          log.message(winner + ' won the match! The database has been updated.', "info");
        }
      });
      db.query('UPDATE fightertable SET losses = losses + 1, matches = matches + 1 WHERE name = $1::text', [loser], function (err) {
        if (err) {
          log.message('11: ' + err.message, "error");
        } else {
          log.message(loser + ' lost the match! The database has been updated.', "info");
        }
      });
      break;
  }
}

function addMatch(redFighter, blueFighter, redBets, blueBets, winner) {
  console.log('we are inside addMatch() before query');
  db.query('select count(*) from matchtable', (err, res) => {
    console.log('we are inside addMatch()');
    if (err) {
      log.message(err.message, "error");
      console.log('there was an error in addMatch()');
    } else {
      let matchTime = new Date().toLocaleString();
      redBets = parseInt(redBets.replace(/,/g, ""));
      blueBets = parseInt(blueBets.replace(/,/g, ""));
      console.log('insert happening');
      db.query('insert into matchtable values ($1::text, $2::text, $3::integer, $4::integer, $5::text, $6::text, $7::text)', [redFighter, blueFighter, redBets, blueBets, winner, matchType, matchTime], (err2, res) => {
        if (err2) {
          log.message('12: ' + err2.message, "error");
        } else {
          log.message('Match has been saved to the database!', "info");
        }
      });
    }
  });
}

function addFavor(redFighter, blueFighter, redBets, blueBets) {
  redBets = parseInt(redBets.replace(/,/g, ""));
  blueBets = parseInt(blueBets.replace(/,/g, ""));
  if (redBets > blueBets) {
    let matchOdds = (Math.round(((redBets / blueBets) * 10)) / 10);
    if (matchOdds >= 1.4) {
      db.query('UPDATE fightertable SET favor = favor + 1 WHERE name = $1::text', [redFighter], function (err) {
        if (err) {
          log.message('13: ' + err.message, "error");
        } else {
          log.message(redFighter + ' was favored!', "info");
        }
      });
    } else {
      log.message('Favor is too close to call!', "info");
    }
  } else if (blueBets > redBets) {
    let matchOdds = (Math.round(((blueBets / redBets) * 10)) / 10);
    if (matchOdds >= 1.4) {
      db.query('UPDATE fightertable SET favor = favor + 1 WHERE name = $1::text', [blueFighter], function (err) {
        if (err) {
          log.message('14: ' + err.message, "error");
        } else {
          log.message(blueFighter + ' was favored!', "info");
        }
      });
    } else {
      log.message('Favor is too close to call!', "info");
    }
  }
}

exports.process = process;
