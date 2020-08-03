const appurl = __dirname;
const path = require('path');
const cookie = require('cookie');
const dbConnection = require(path.join(__dirname, 'includes', 'poker_client', 'DatabaseConnection.js'))

const rooms = {};
const Game = require(path.join(__dirname, 'includes', 'poker_client', 'Game.js'))
const Player = require(path.join(__dirname, 'includes', 'poker_client', 'Player.js'))
// Setup Express Application

const express = require('express');
const app = express();
const PORT = process.env.PORT || 4569;
const server = app.listen(PORT, () => console.log(`server started on port ${PORT}`));
const bodyparser = require('body-parser');
app.set('view-engine', 'twig')
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({
	extended: true
}));
app.use(express.static('public'))

//update games data
const fs = require('fs');
dbConnection.query('SELECT table_id, big_blind, seats, players FROM `table_data`', (err, results) => {
	results.forEach(table => {
		rooms[table["table_id"].toString()] = new Game(table["seats"], table["big_blind"])

	})
	fs.writeFile(path.join(__dirname, 'public', 'games', 'games.json'), JSON.stringify(results), function(err) {
		if (err) {
			console.log(err)
		}
	})
})

//Setup validation, encryption and session
const cookieParser = require('cookie-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const {
	body,
	validationResult
} = require('express-validator');
const validator = require('express-validator');
const sanitise = require('validator');
// added package for session storage in database to allow socketio to identify users
const mysqlSessions = require('express-mysql-session')(session);
const mySqlStore = new mysqlSessions({
	host: "localhost",
	user: "root",
	password: "root",
	database: "pokerdb"
}, dbConnection);
app.use(cookieParser('finalyearproject'));
app.use(session({
	key: 'user sid',
	secret: 'tompokerproject',
	resave: false,
	saveUninitialized: false,
	userId: "",
	username: "",
	tablescreated: 0,
	store: mySqlStore,
	path: '/',
	cookie: {
		secure: false,
		maxAge: 18000000
	}
}));
app.use((req, res, next) => {
	if (req.cookies.user_sid && !req.session.username) {
		res.clearCookie('user_sid');
	}
	next();
});

const flash = require('express-flash-messages')

app.use(flash());

// DECLARING CUSTOM MIDDLEWARE
const ifNotLoggedin = (req, res, next) => {
	if (!req.session.username || !req.cookies.user_sid) {
		return res.render(path.join(__dirname, 'includes', 'twig_templates', 'login.twig'));
	}
	next();
}

const ifLoggedin = (req, res, next) => {

	if (req.session.userId && req.cookies.user_sid) {
		//Requests chips from database to show on lobby screen
		return new Promise((resolve, reject) => {
			dbConnection.execute('SELECT chips FROM `balance_data` WHERE user_id=?', [req.session.userId], (err, results) => {
				if (err) {

				}
				return results
			}).then(function(results) {
				resolve(res.render(path.join(__dirname, 'includes', 'twig_templates', 'lobby.twig'), {
					balance: results[0][0]["chips"],
					username: req.session.username
				}))
			})
		})

	}
	next();
}

const ifOnTable = (req, res, next) => {
	let isontable = false;

	for (let key of Object.keys(rooms)) {
		if (rooms[key].findPlayerById(req.session.userId) != false) {
			isontable = true;
			break
		}
	}
	if (isontable) {
		return res.render(path.join(__dirname, 'includes', 'twig_templates', 'game.twig'), );
	}
	next();
}

//Setup Socket.io
const socket = require('socket.io');
const timeoutCallback = require('timeout-callback');
let io = socket(server);
io.on('connection', function(socket) {
	socket.emit('connected', 'You are connected')

	console.log("New User Connected")

	socket.on('createtable', data => {

		seats = Number(data["seats"]);
		bigblind = Number(data["bigblind"])
		if (seats <= 9 && seats >= 1 && bigblind > 1) {
			//check in session how many tables user has created if it is 3 then don't allow user to create any more tables
			let validatesession = 'SELECT data FROM `sessions` WHERE session_id=\'' + cookie.parse(socket.handshake.headers.cookie)["user_sid"] + '\'';
			dbConnection.execute(validatesession, (err, results) => {
				if (err) {
					socket.emit('errormessage', 'Database error occurred');
				}
				let sqldata = JSON.parse(results[0]["data"])
				if (sqldata["tablescreated"] < 3) {
					//Takes session data and increases the tablescreated value and updates
					sqldata["tablescreated"] += 1;
					sqldata = JSON.stringify(sqldata)
					let validatesession2 = 'UPDATE `sessions` SET data = \'' + sqldata + '\' WHERE session_id=\'' + cookie.parse(socket.handshake.headers.cookie)["user_sid"] + '\'';
					dbConnection.execute(validatesession2, (err, results) => {
						if (err) {
							socket.emit('errormessage', 'Database error occurred');
						}
					})

					dbConnection.execute('INSERT INTO `table_data` (big_blind, small_blind, seats, players, chips) VALUES (?, ?, ?, ?, ?)', [data["bigblind"], data["bigblind"] / 2, data["seats"], 0, 0], (err, results) => {
						if (err) {
							socket.emit('errormessage', 'Unable to create table');
						} else {
							socket.emit('confirmation', 'Table Created');
						}
						return results;
					}).then(function(insertresult) {
						console.log(insertresult)
						dbConnection.query('SELECT table_id, big_blind, seats, players FROM `table_data`;', (err, results) => {
							fs.writeFile(path.join(__dirname, 'public', 'games', 'games.json'), JSON.stringify(results), function(err) {
								if (err) {
									socket.emit('errormessage', 'Database error occurred');
								}

							})
						})
						rooms[insertresult[0]["insertId"]] = new Game(data["seats"], data["bigblind"]);
						console.log(rooms)
					})

				} else {
					socket.emit('errormessage', 'Maximum table creation reached')
				}

			})
		} else {
			socket.emit('errormessage', 'Invalid data entered');
		}
	});
	socket.on("join_table", (tableid, chips) => {

		if (Number(tableid) > 0 && chips > 0) {
			if (chips >= (rooms[tableid].getBigBlind() * 10)) {
				//retrieves user session to authenticate user
				let sessionidstatement = 'SELECT data FROM `sessions` WHERE session_id=\'' + cookie.parse(socket.handshake.headers.cookie)["user_sid"] + '\''
				dbConnection.execute(sessionidstatement, (err, results) => {
					if (err) {
						socket.emit('errormessage', 'Database error occurred');
					}
					let userid = Number(JSON.parse(results[0]["data"])["userId"])
					let username = JSON.parse(results[0]["data"])["username"]
					//checks all table instances to see if the player is already playing
					let playerfound = false;
					let validchips = true;
					let tablefull = false;
					for (let key of Object.keys(rooms)) {
						if (rooms[key].findPlayerById(userid) != false) {
							socket.emit('errormessage', 'You cannot play multiple tables at once')
							playerfound = true;
							break
						}
					}
					//checks if chips amount is >= tablemin
					if (chips <= 0) {
						validchips = false;
						socket.emit('errormessage', 'You cannot buyin with this chip amount')
					}
					console.log("hello")

					if (!playerfound && validchips) {
						//checks if player has enough chips to buy in for that amount
						let preparedstatement2 = 'SELECT chips FROM `balance_data` WHERE user_id=' + userid
						dbConnection.execute(preparedstatement2, (err, results) => {
							if (chips <= results[0]["chips"]) {
								//adds player to the game object and redirects to game page
								rooms[tableid].addPlayer(new Player(userid, username, chips));
								if (rooms[tableid].findPlayerById(userid)) {
									//moves player buyin to table data
									let preparedupdate = `UPDATE balance_data SET chips = chips - ${chips} WHERE user_id = ${userid}`
									let preparedupdate2 = `UPDATE table_data SET chips = chips + ${chips}, players = players + 1 WHERE table_id = ${tableid}`
									console.log(preparedupdate)
									dbConnection.execute(preparedupdate, (err) => {
										if (err) {
											socket.emit('errormessage', 'Database error occurred');
										}

									})

									dbConnection.execute(preparedupdate2, (err) => {
										if (!err) {
											//updates games.json to show player has joined table
											dbConnection.query('SELECT table_id, big_blind, seats, players FROM `table_data`;', (err, results) => {
												fs.writeFile(path.join(__dirname, 'public', 'games', 'games.json'), JSON.stringify(results), function(err) {
													if (err) {
														socket.emit('errormessage', 'Database error occurred');
													}
												})
											})
										} else {
											socket.emit('errormessage', 'Database error occurred');
										}

									})
									socket.emit('redirect', '/game')
								} else {
									socket.emit('errormessage', 'Table is full')
								}


							} else {
								socket.emit('errormessage', 'You do not have enough chips for this buyin.')
							}
						})
					}

				})
			} else {
				socket.emit('errormessage', ('Minimum buyin for table is ' + +rooms[tableid].getBigBlind() * 10))
			}
		} else {
			socket.emit('errormessage', 'Invalid data entered');
		}
	})

	socket.on('initialise_table', () => {

		//retrieves session data to authenticate user
		let sessionidstatement2 = 'SELECT data FROM `sessions` WHERE session_id=\'' + cookie.parse(socket.handshake.headers.cookie)["user_sid"] + '\'';
		dbConnection.execute(sessionidstatement2, (err, results) => {
			if (err) {
				socket.emit('errormessage', 'Database error occurred');
			}
			let playertableid
			let playerposition

			let userid = Number(JSON.parse(results[0]["data"])["userId"])
			//finds a table occurence that is linked to the session
			for (let key of Object.keys(rooms)) {
				if (rooms[key].findPlayerById(userid) != false) {
					playertableid = key;
					playerposition = rooms[key].findPlayerById(userid);
					//sets socketid to player so authentication is no longer needed
					rooms[key].setPlayerSid(playerposition, socket.id)

					//creates a custom position array for the user to give custom view
					playerpositionarray = rooms[key].getPlayerPositionArray()
					playerpositionarray2 = rooms[key].getCustomPlayerPositionArray(playerposition)

					//sends updated view array to all users on the table when a new user joins
					for (let key of Object.keys(playerpositionarray)) {
						if (playerpositionarray[key] != false) {

							playerpositionarraycustom = rooms[playertableid].getCustomPlayerPositionArray(key);

							socket.to(rooms[playertableid].getPlayerSid(key)).emit('init_community', {
								'pot': rooms[playertableid].getPot(),
								'cards': rooms[playertableid].getCommunityCards()
							});
							socket.to(rooms[playertableid].getPlayerSid(key)).emit('init_table_details', playerpositionarraycustom);
						}

					}
					//adds socketid to table room for broadcasted messages
					socket.join(playertableid)
					socket.emit('init_community', {
						'pot': rooms[playertableid].getPot(),
						'cards': rooms[playertableid].getCommunityCards()
					});
					socket.emit('init_table_details', playerpositionarray2)
					if (io.nsps['/'].adapter.rooms[playertableid]["length"] >= 2 && rooms[playertableid].getHandInProgress() == true) {
						if (rooms[playertableid].getAllowAction() == true) {
							socket.emit('continuegamebounceback', playertableid)
						}

					}
					if (io.nsps['/'].adapter.rooms[playertableid]["length"] >= 2 && rooms[playertableid].getHandInProgress() == false) {
						socket.emit('startgamebounceback', playertableid)
					}

					if (rooms[key].getPlayerCards(playerposition) != false) {
						let playercards = rooms[key].getPlayerCards(playerposition);
						let cards = [playercards[0]["suit"][0] + playercards[0]["value"],
							playercards[1]["suit"][0] + playercards[1]["value"]
						];

						io.to(rooms[key].getPlayerSid(playerposition)).emit('private_cards', cards);
					}

					io.to(playertableid).emit('pot', rooms[playertableid].getPot());
					io.to(playertableid).emit('community', rooms[playertableid].getCommunityCards())

					break;
				}

			}
		})

	})

	socket.on('begingame', table_id => {
		if (Number(table_id) > 0) {
			let handid = rooms[table_id].getHandId();
			//deals the cards if there isnt a hand already in progress
			if (rooms[table_id].getHandInProgress() == false) {
				console.log(rooms[table_id])
				rooms[table_id].dealCards();
			}

			// console.log(rooms[table_id])
			let playerpositions = rooms[table_id]["playerposition"]

			let playerpositionarray = rooms[table_id].getPlayerPositionArray();
			for (let key of Object.keys(playerpositions)) {
				//sends the the cards to the user if the user has any cards.
				if (playerpositions[key] != 'Empty') {
					if (playerpositions[key].getCards()[0] != null) {
						let cards = [playerpositions[key].getCards()[0]["suit"][0] + playerpositions[key].getCards()[0]["value"],
							playerpositions[key].getCards()[1]["suit"][0] + playerpositions[key].getCards()[1]["value"]
						];
						io.to(rooms[table_id.toString()].getPlayerSid(key)).emit('private_cards', cards);
					}
				}
			}

			// console.log("hello")
			let acted = false;
			//actionposition holds the position of the next player to act
			let actionpos = rooms[table_id].getActionPos();
			let roundover = false;
			// console.log(actionpos)
			//allowaction is used to stop multiple action requests being made on a table at once
			rooms[table_id].setAllowAction(false);
			for (let lcv = actionpos; lcv <= Object.keys(playerpositionarray).length; lcv++) {

				//requests action from the first player to the right of the action position
				if (acted == false && playerpositionarray[lcv.toString()] != false) {
					customarray = rooms[table_id].getCustomPlayerPositionArray(lcv.toString());
					//shows the user the bet buttons / slider and waits 30 seconds for a response, if no response it will fold.
					io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('showoptions', customarray, timeoutCallback(30000, function(err, received) {
						highestAmount = 0;
						for (let key of Object.keys(customarray)) {
							if (customarray[key][2] > highestAmount) {
								highestAmount = customarray[key][2];
							}
						}
						if (received == "Check / Call" && rooms[table_id].getHandInProgress() == true && rooms[table_id].getHandId() == handid) {
							console.log(received)
							rooms[table_id.toString()].setActionPos(lcv + 1)
							if (Number(highestAmount) > Number(customarray['1'][2])) {
								amountbet = highestAmount - Number(customarray['1'][2])
								rooms[table_id.toString()].playerBet(lcv.toString(), amountbet, '1');
							}
							io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('hideoptions')
							io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('initbounceback');
						} else if ((received == "Fold" || received == new Error('callback timeout')) && rooms[table_id].getHandInProgress() == true && rooms[table_id].getHandId() == handid) {
							console.log(received)
							rooms[table_id.toString()].setActionPos(lcv + 1)
							rooms[table_id.toString()].playerFold(lcv.toString())
							io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('folded')
							io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('hideoptions')
							io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('initbounceback');

						} else if (Number(received) != NaN && received != null && rooms[table_id].getHandInProgress() == true && rooms[table_id].getHandId() == handid) {
							console.log(received)
							rooms[table_id.toString()].setActionPos(lcv + 1)
							amountraised = received - Number(customarray['1'][2]);
							rooms[table_id.toString()].playerBet(lcv.toString(), amountraised, '1');
							io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('hideoptions')
							io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('initbounceback');
						} else if (rooms[table_id].getHandInProgress() == true && rooms[table_id].getHandId() == handid) {
							console.log(received)
							rooms[table_id.toString()].setActionPos(lcv + 1)
							rooms[table_id.toString()].playerFold(lcv.toString())
							io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('folded')
							io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('hideoptions')
							io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('initbounceback');
						}
						if (rooms[table_id].getHandInProgress() == true && rooms[table_id].getHandId() == handid) {
							rooms[table_id].setPlayerActed(lcv.toString(), true)
							rooms[table_id].setAllowAction(true);
						}
					}));
					acted = true;
				}
			}
			// requests action from first player to the left of the action position starting at position 1
			for (let lcv = 1; lcv <= actionpos; lcv++) {

				if (acted == false && playerpositionarray[lcv.toString()] != false) {
					customarray = rooms[table_id].getCustomPlayerPositionArray(lcv.toString());
					io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('showoptions', customarray, timeoutCallback(30000, function(err, received) {
						highestAmount = 0;
						for (let key of Object.keys(customarray)) {
							if (customarray[key][2] > highestAmount) {
								highestAmount = customarray[key][2];
							}
						}

						if (received == "Check / Call" && rooms[table_id].getHandInProgress() == true && rooms[table_id].getHandId() == handid) {
							console.log(received)
							rooms[table_id.toString()].setActionPos(lcv + 1)
							if (Number(highestAmount) > Number(customarray['1'][2])) {
								amountbet = highestAmount - Number(customarray['1'][2])
								rooms[table_id.toString()].playerBet(lcv.toString(), amountbet, '1');
							}
							io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('hideoptions')
							io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('initbounceback');
						} else if ((received == "Fold" || err != null) && rooms[table_id].getHandInProgress() == true && rooms[table_id].getHandId() == handid) {
							console.log(received)
							rooms[table_id.toString()].setActionPos(lcv + 1)
							rooms[table_id.toString()].playerFold(lcv.toString())
							io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('folded')
							io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('hideoptions')
							io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('initbounceback');

						} else if (Number(received) != NaN && received != null && rooms[table_id].getHandInProgress() == true && rooms[table_id].getHandId() == handid) {
							console.log(received)
							rooms[table_id.toString()].setActionPos(lcv + 1)
							amountraised = received - Number(customarray['1'][2]);
							rooms[table_id.toString()].playerBet(lcv.toString(), amountraised, '1');
							io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('hideoptions')
							io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('initbounceback');
						} else if (rooms[table_id].getHandInProgress() == true && rooms[table_id].getHandId() == handid) {
							console.log(received)
							rooms[table_id.toString()].setActionPos(lcv + 1)
							rooms[table_id.toString()].playerFold(lcv.toString())
							io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('folded')
							io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('hideoptions')
							io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('initbounceback');
						}
						if (rooms[table_id].getHandInProgress() == true && rooms[table_id].getHandId() == handid) {
							rooms[table_id].setPlayerActed(lcv.toString(), true)
							rooms[table_id].setAllowAction(true);
						}
					}));
					acted = true;
				}

			}
			//initialises table for all players with updated information
			socket.emit('initbounceback');
		} else {
			socket.emit('errormessage', 'Invalid data entered');
		}
	})

	socket.on('continuegame', table_id => {
		if (Number(table_id) > 0) {
			let handid = rooms[table_id].getHandId();
			if (rooms[table_id].getAllowAction() == true) {
				rooms[table_id].setAllowAction(false);
				let playerpositionarray = rooms[table_id].getPlayerPositionArray();
				console.log("------------------------------------------------")
				let acted = false;

				let actionpos = rooms[table_id].getActionPos();
				let roundover = false;
				console.log("ActionPos: ")
				console.log(actionpos)

				//tests to see if everyone's bet is equal so that it can deal the next card
				let testvalue = []
				let testvalue2 = true

				for (let key of Object.keys(playerpositionarray)) {
					if (playerpositionarray[key] != false) {
						if (rooms[table_id].getPlayerFold(key) != true) {
							//check if player has cards or is all in 
							testvalue.push(playerpositionarray[key][2])
							testvalue2 = (testvalue2 && (rooms[table_id].getPlayerActed(key)));
						}

					}
				}
				//if only one player is left playing then skip the player options and award pot
				let playersleft = []
				for (let key of Object.keys(playerpositionarray)) {
					if (playerpositionarray[key] != false) {
						if (rooms[table_id].getPlayerFold(key) != true) {
							//check if player has cards or is all in 
							playersleft.push(key)
						}

					}
				}
				console.log("Testval: ")
				console.log(testvalue)
				console.log("Testval2: ")
				console.log(testvalue2)
				roundover = testvalue.every((val, i, arr) => val === arr[0]);
				//if all players are all in or if everyone but one player is all in it sets roundover to true
				if ((testvalue.length - rooms[table_id].getAllinPlayers().length) == 1) {
					console.log(10)
					for (let key of Object.keys(playerpositionarray)) {
						console.log(9)
						if (playerpositionarray[key] != 'Empty') {
							console.log(8)
							if (rooms[table_id].getAllinPlayers().includes(key) == false) {
								console.log(7)
								if (playerpositionarray[key][2] >= testvalue.reduce(function(a, b) {
										return Math.max(a, b);
									})) {
									testvalue2 = true
									roundover = true;

								}
							}
						}
					}
					if (testvalue.every((val, i, arr) => val === 0)) {

						testvalue2 = true
						roundover = true;

					}
				} else if (testvalue.length == rooms[table_id].getAllinPlayers().length) {
					testvalue2 = true
					roundover = true;
				}

				if (playersleft.length == 1) {
					roundover = true;
					testvalue2 = true;
				}
				console.log("roundover: ")
				console.log(roundover)
				roundover = roundover && testvalue2;
				console.log("roundover: ")
				console.log(roundover)

				//if everyone has bet the same amount and the player in the bb has already acted then it will not request next action
				if (roundover == false) {
					console.log("hello123456")
					for (let lcv = actionpos; lcv <= Object.keys(playerpositionarray).length; lcv++) {
						if (acted == false && playerpositionarray[lcv.toString()] != false) {

							//skips player action if player is all in
							if (playerpositionarray[lcv.toString()][0] == 0 || playerpositionarray[lcv.toString()][4] == true || playerpositionarray[lcv.toString()][3] == true) {
								//check if player has cards or is all in 
								rooms[table_id].setPlayerActed(lcv.toString(), true)
								rooms[table_id].setActionPos((Number(lcv) + 1))
								rooms[table_id].setAllowAction(true);
								socket.emit('initbounceback');
								acted = true
								break
							}
							customarray = rooms[table_id].getCustomPlayerPositionArray(lcv.toString());
							console.log(customarray)
							io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('showoptions', customarray, timeoutCallback(30000, function(err, received) {
								highestAmount = 0;
								for (let key of Object.keys(customarray)) {
									if (customarray[key][2] > highestAmount) {
										highestAmount = customarray[key][2];
									}
								}
								if (received == "Check / Call" && rooms[table_id].getHandInProgress() == true && rooms[table_id].getHandId() == handid) {
									console.log(received)
									rooms[table_id.toString()].setActionPos(lcv + 1)
									if (Number(highestAmount) > Number(customarray['1'][2])) {
										amountbet = highestAmount - Number(customarray['1'][2])
										rooms[table_id.toString()].playerBet(lcv.toString(), amountbet, '1');
									}
									io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('hideoptions')
									io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('initbounceback');
								} else if ((received == "Fold" || received == new Error('callback timeout')) && rooms[table_id].getHandInProgress() == true && rooms[table_id].getHandId() == handid) {
									console.log(received)
									rooms[table_id.toString()].setActionPos(lcv + 1)
									rooms[table_id.toString()].playerFold(lcv.toString())
									io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('folded')
									io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('hideoptions')
									io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('initbounceback');

								} else if (Number(received) != NaN && received != null && rooms[table_id].getHandInProgress() == true && rooms[table_id].getHandId() == handid) {
									console.log(received)
									rooms[table_id.toString()].setActionPos(lcv + 1)
									amountraised = received - Number(customarray['1'][2]);
									rooms[table_id.toString()].playerBet(lcv.toString(), amountraised, '1');
									io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('hideoptions')
									io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('initbounceback');
								} else if (rooms[table_id].getHandInProgress() == true && rooms[table_id].getHandId() == handid){
									console.log(received)
									rooms[table_id.toString()].setActionPos(lcv + 1)
									rooms[table_id.toString()].playerFold(lcv.toString())
									io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('folded')
									io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('hideoptions')
									io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('initbounceback');
								}

								if (rooms[table_id].getHandInProgress() == true && rooms[table_id].getHandId() == handid) {
									if (lcv.toString() == rooms[table_id].getBbAction()) {
										rooms[table_id].setBbAction()
									}
									rooms[table_id].setPlayerActed(lcv.toString(), true)
									rooms[table_id].setAllowAction(true);
								}

							}));
							acted = true;
						}
					}
					for (let lcv = 1; lcv <= actionpos; lcv++) {

						if (acted == false && playerpositionarray[lcv.toString()] != false) {
							if (playerpositionarray[lcv.toString()][0] == 0 || playerpositionarray[lcv.toString()][4] == true || playerpositionarray[lcv.toString()][3] == true) {
								//check if player has cards or is all in 
								rooms[table_id].setPlayerActed(lcv.toString(), true)
								rooms[table_id].setActionPos((Number(lcv) + 1))
								rooms[table_id].setAllowAction(true);
								socket.emit('initbounceback');
								acted = true

								break
							}
							customarray = rooms[table_id].getCustomPlayerPositionArray(lcv.toString());
							io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('showoptions', customarray, timeoutCallback(30000, function(err, received) {
								highestAmount = 0;
								for (let key of Object.keys(customarray)) {
									if (customarray[key][2] > highestAmount) {
										highestAmount = customarray[key][2];
									}
								}

								if (received == "Check / Call" && rooms[table_id].getHandInProgress() == true && rooms[table_id].getHandId() == handid) {
									console.log(received)
									rooms[table_id.toString()].setActionPos(lcv + 1)
									if (Number(highestAmount) > Number(customarray['1'][2])) {
										amountbet = highestAmount - Number(customarray['1'][2])
										rooms[table_id.toString()].playerBet(lcv.toString(), amountbet, '1');
									}
									io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('hideoptions')
									io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('initbounceback');
								} else if ((received == "Fold" || err != null) && rooms[table_id].getHandInProgress() == true && rooms[table_id].getHandId() == handid) {
									console.log(received)
									rooms[table_id.toString()].setActionPos(lcv + 1)
									rooms[table_id.toString()].playerFold(lcv.toString())
									io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('folded')
									io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('hideoptions')
									io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('initbounceback');

								} else if (Number(received) != NaN && received != null && rooms[table_id].getHandInProgress() == true && rooms[table_id].getHandId() == handid) {
									console.log(received)
									rooms[table_id.toString()].setActionPos(lcv + 1)
									amountraised = received - Number(customarray['1'][2]);
									rooms[table_id.toString()].playerBet(lcv.toString(), amountraised, '1');
									io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('hideoptions')
									io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('initbounceback');
								} else if (rooms[table_id].getHandInProgress() == true && rooms[table_id].getHandId() == handid) {
									console.log(received)
									rooms[table_id.toString()].setActionPos(lcv + 1)
									rooms[table_id.toString()].playerFold(lcv.toString())
									io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('folded')
									io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('hideoptions')
									io.sockets.connected[rooms[table_id.toString()].getPlayerSid(lcv.toString())].emit('initbounceback');
								}
								if (rooms[table_id].getHandInProgress() == true && rooms[table_id].getHandId() == handid) {
									if (lcv.toString() == rooms[table_id].getBbAction()) {
										rooms[table_id].setBbAction()
									}
									rooms[table_id].setPlayerActed(lcv.toString(), true)
									rooms[table_id].setAllowAction(true);
								}
							}));
							acted = true;
						}
					}
				} else {
					if (playersleft.length == 1) {
						//award pot to player and next hand
						rooms[table_id].resetPlayerWageredRound();
						rooms[table_id].awardPot(playersleft[0])
						rooms[table_id].resetPlayerWagered();
						socket.emit('initbounceback');
						//removes players with 0 chips from the game and removes them from the socket room

						rooms[table_id].clearZeroChipPlayers().forEach(removedplayerid => {
							let preparedupdate2 = 'UPDATE table_data SET players = `players` - 1 WHERE table_id = ' + table_id
							dbConnection.execute(preparedupdate2, (err, result) => {
								console.log(err)
								if (err) {

									socket.emit('errormessage', 'Database error occurred');
								} else {
									return result
								}
							})
							setTimeout(() => {
								dbConnection.query('SELECT table_id, big_blind, seats, players FROM `table_data`', (err, results) => {
									fs.writeFile(path.join(__dirname, 'public', 'games', 'games.json'), JSON.stringify(results), function(err) {
										
										if (err) {

											console.log(err)
										}
									})
								})
							}, 5000);
							
							if (io.nsps['/'].sockets[removedplayerid] != null)
								io.nsps['/'].sockets[removedplayerid].leave(table_id);
						})
						rooms[table_id].moveButton();

						setTimeout(function() {
							rooms[table_id].resetPlayerActed();
							rooms[table_id].resetTableFold();
							rooms[table_id].resetTableCards();
							rooms[table_id].resetPlayerWageredRound();
							rooms[table_id].resetPlayerWagered();
							rooms[table_id].resetCommunityCards();

							rooms[table_id].setHandInProgress(false)
							rooms[table_id].setAllowAction(true);
							socket.emit('initbounceback');
						}, 1000)
					} else {
						// deal flop turn or river 
						let community = rooms[table_id].getCommunityCards();
						if (community.length == 0) {
							rooms[table_id].dealFlop();
							newactionpos = rooms[table_id].getButtonPos() + 1
							if (newactionpos > Object.keys(rooms[table_id]).length) {
								rooms[table_id].setActionPos(1);
							} else {
								rooms[table_id].setActionPos(newactionpos);
							}
							rooms[table_id].resetPlayerActed()
							rooms[table_id].resetPlayerWageredRound();
							setTimeout(function() {
								rooms[table_id].setAllowAction(true);

								socket.emit('initbounceback');
							}, 100)
							console.log(rooms[table_id])

						} else if (community[0].length == 3 || community[0].length == 4) {
							rooms[table_id].dealTurnRiver()
							newactionpos = rooms[table_id].getButtonPos() + 1
							if (newactionpos > Object.keys(rooms[table_id]).length) {
								rooms[table_id].setActionPos(1);
							} else {
								rooms[table_id].setActionPos(newactionpos);
							}
							rooms[table_id].resetPlayerActed()
							rooms[table_id].resetPlayerWageredRound();
							setTimeout(function() {
								rooms[table_id].setAllowAction(true);

								socket.emit('initbounceback');
							}, 100)
						} else if (community[0].length == 5) {
							//assess cards to find winner

							evaluator_result = rooms[table_id].evaluateHands();
							console.log("------------------------------------------------------------------------")
							console.log(evaluator_result)
							console.log(rooms[table_id])
							console.log("------------------------------------------------------------------------")
							//send player cards for everyone to see
							rooms[table_id].showPlayerCards();
							socket.emit('initbounceback');
							rooms[table_id].resetPlayerWagered();
							setTimeout(function() {
								rooms[table_id].clearZeroChipPlayers().forEach(removedplayerid => {
									let preparedupdate2 = 'UPDATE table_data SET players = `players` - 1 WHERE table_id = ' + table_id
									dbConnection.execute(preparedupdate2, (err) => {
										if (err) {
											socket.emit('errormessage', 'Database error occurred');
										}
									})
									setTimeout(() => {
										dbConnection.query('SELECT table_id, big_blind, seats, players FROM `table_data`', (err, results) => {
											fs.writeFile(path.join(__dirname, 'public', 'games', 'games.json'), JSON.stringify(results), function(err) {
												
												if (err) {
	
													console.log(err)
												}
											})
										})
									}, 5000);
	
			
									io.nsps['/'].sockets[removedplayerid].leave(table_id);
								})
							}, 1000)
							rooms[table_id].moveButton();

							setTimeout(function() {

								rooms[table_id].resetPlayerWageredRound();
								rooms[table_id].resetPlayerActed();
								rooms[table_id].resetTableFold();
								rooms[table_id].resetTableCards();
								rooms[table_id].resetCommunityCards();
								rooms[table_id].setHandInProgress(false)
								rooms[table_id].setAllowAction(true);
								socket.emit('initbounceback');
							}, 5000)

							//need to clear community cards
						}

					}
				}
			}
		} else {
			socket.emit('errormessage', 'Invalid data entered');
		}
	})

	socket.on('leave_room', (callback) => {
		//retrieves session data to authenticate user
		let sessionidstatement3 = 'SELECT data FROM `sessions` WHERE session_id=\'' + cookie.parse(socket.handshake.headers.cookie)["user_sid"] + '\'';
		dbConnection.execute(sessionidstatement3, (err, results) => {
			if (err) {
				socket.emit('errormessage', 'Database error occurred');
			}
			let playertableid
			let playerposition

			let userid = Number(JSON.parse(results[0]["data"])["userId"])
			//finds a table occurence that is linked to the session
			for (let key of Object.keys(rooms)) {
				if (rooms[key].findPlayerById(userid) != false) {
					playertableid = key;
					playerposition = rooms[key].findPlayerById(userid);
					//sets socketid to player so authentication is no longer needed

					break
				}
			}
			if(playerposition) {
			let playerpositionarray = rooms[playertableid].getPlayerPositionArray();
			//find table balance, update table data to remove the chips, add to player balance remove from Game.
			rooms[playertableid].playerFold(playerposition)
			let table_balance = rooms[playertableid].getUserBalance(playerposition)
			//set table balance to 0
			rooms[playertableid].resetUserBalance(playerposition);

			rooms[playertableid].setAllowAction(true);
			rooms[playertableid].resetUserId(playerposition)

			for (let key of Object.keys(playerpositionarray)) {
				if (playerpositionarray[key] != false) {
					socket.to(rooms[playertableid].getPlayerSid(key)).emit('initbounceback');
				}

			}
			if (rooms[playertableid].getHandInProgress() == false) {
				rooms[playertableid].clearZeroChipPlayers().forEach(removedplayerid => {
					io.nsps['/'].sockets[removedplayerid].leave(playertableid);

					
				})
			}

			let preparedupdate = 'UPDATE balance_data SET chips = `chips` + ' + table_balance + ' WHERE user_id = ' + userid
			let preparedupdate2 = 'UPDATE table_data SET chips = `chips` - ' + table_balance + ', players = `players` - 1 WHERE table_id = ' + playertableid
			let preparedupdate3 = 'UPDATE table_data SET chips = `chips` - ' + table_balance + ' WHERE table_id = ' + playertableid
			console.log(preparedupdate2)
			dbConnection.execute(preparedupdate, (err) => {
				if (err) {
					socket.emit('errormessage', 'Database error occurred');
				}
				
			})
			if (rooms[playertableid].getHandInProgress()) {
				dbConnection.execute(preparedupdate3, (err) => {
					if (err) {
						socket.emit('errormessage', 'Database error occurred');
					}
				})
			} else {
				dbConnection.execute(preparedupdate2, (err) => {
				if (err) {
					socket.emit('errormessage', 'Database error occurred');
				}
			})
			}

			setTimeout(() => {
				dbConnection.query('SELECT table_id, big_blind, seats, players FROM `table_data`', (err, results) => {
					fs.writeFile(path.join(__dirname, 'public', 'games', 'games.json'), JSON.stringify(results), function(err) {
						
						if (err) {

							console.log(err)
						}
					})
				})
			}, 5000);
			

		}
			callback("done");

		})
	})

	socket.on('disconnect', () => {
		console.log("User Disconnected")

	})
});

//Setup express routing
app.get('/', ifOnTable, ifLoggedin, (req, res) => {
	res.render(path.join(__dirname, 'includes', 'twig_templates', 'login.twig'), {
		app_url: appurl
	});
})

app.get('/login', ifLoggedin, (req, res) => {

	res.render(path.join(__dirname, 'includes', 'twig_templates', 'login.twig'), {
		app_url: appurl,

	});
})
app.get('/logout', ifNotLoggedin, (req, res) => {
	req.session.destroy(function(err) {
		if (err) {
			return next(err);
		} else {
			return res.redirect('/');
		}
	});
})
app.get('/register', (req, res) => {
	res.render(path.join(__dirname, 'includes', 'twig_templates', 'register.twig'), );
})

app.get('/lobby', ifNotLoggedin, ifOnTable, (req, res) => {
	dbConnection.execute('SELECT chips FROM `balance_data` WHERE user_id=?', [req.session.userId], (err, results) => {
		return results
	}).then(balance => {
		res.render(path.join(__dirname, 'includes', 'twig_templates', 'lobby.twig'), {
			username: req.session.username,
			balance: balance[0][0]["chips"]
		});
	})

})
app.get('/game', ifNotLoggedin, ifOnTable, (req, res) => {
	//only allows game view to be rendered if the user is already on a table
	res.redirect("/lobby");

})

// Express POST Routes

app.post('/sendregister', ifLoggedin,
	//validation
	[
		body('email', 'INVALID EMAIL ADDRESS<br>').isEmail().normalizeEmail(),

		body('email').custom(emailaddress => {
			return new Promise((resolve, reject) => {
				dbConnection.execute('SELECT email FROM `user_data` WHERE email=?', [emailaddress], (err, results) => {
					if (err) {
						reject('DATABASE ERROR OCCURED<br>')
					}
					return results
				}).then(function(results) {
					console.log(results[0].length)
					if (results[0].length > 0) {
						reject('EMAIL ADDRESS ALREADY IN USE<br>')
					} else {
						resolve()
					}

				})
			})
		}),
		body('username', 'USERNAME CONTAINS ILLEGAL CHARACTERS<br>').escape().whitelist(['ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890']),
		body('username').custom(username => {
			return new Promise((resolve, reject) => {
				dbConnection.execute('SELECT user_name FROM `user_data` WHERE user_name=?', [username], (err, results) => {
					return results
				}).then(function(results) {
					console.log(results[0].length)
					if (results[0].length > 0) {
						reject('USERNAME ALREADY IN USE<br>')
					} else {

						resolve()
					}

				})
			})
		}),

		body('username', 'USERNAME CAN BE UP TO 12 CHARACTERS<br>').isLength({
			min: 1,
			max: 12
		}),
		body('password', 'PASSWORD MUST BE 6 CHARACTERS LONG<br>').trim().isLength({
			min: 6
		}),

	],
	(req, res, next) => {
		const validation_result = validationResult(req);
		const {
			email,
			username,
			password
		} = req.body;
		//if there are no validation errors
		if (validation_result.isEmpty()) {
			//inserts registration information to database
			bcrypt.hash(password, 12).then(function(hash) {
				dbConnection.execute("INSERT INTO `user_data`(`user_name`,`email`,`password`) VALUES(?,?,?)", [username, email, hash], (err, results) => {
					if (err) {
						req.flash('error', 'Database error has occured')
						res.render(path.join(__dirname, 'includes', 'twig_templates', 'login.twig'), );
					}
					return results;
				}).then(results => {
					//add zero chips and an entry to balance
					dbConnection.execute("INSERT INTO `balance_data`(`user_id`,`chips`) VALUES(?,?)", [results[0].insertId, 0])
					req.flash('notify', 'Registration Successful')
					res.render(path.join(__dirname, 'includes', 'twig_templates', 'login.twig'), );
				})
			})
		} else {
			//throw error on registration screen by adding error messages to session info and flashing
			validation_result["errors"].forEach(error => {
				req.flash('error', error["msg"])
			});
			res.render(path.join(__dirname, 'includes', 'twig_templates', 'register.twig'), );

		}
	});

app.post('/sendlogin', ifLoggedin,
	//validation
	[
		//checks if username exists in database
		body('username').escape().whitelist(['ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890']),
		body('username').custom(username => {
			return new Promise((resolve, reject) => {
				dbConnection.execute('SELECT password FROM `user_data` WHERE user_name=?', [username], (err, results) => {
					return results
				}).then(function(results) {
					if (results[0].length > 0) {
						let dbpasswordhash = results[0][0]['password']
						resolve()

					} else {
						reject('USERNAME DOES NOT EXIST<br>')

					}

				})
			})
		}),
		//checks if password is 6 letters long
		body('password', 'PASSWORD MUST BE 6 CHARACTERS LONG').trim().isLength({
			min: 6
		}),
	],
	(req, res) => {

		const validation_result = validationResult(req);
		console.log(validation_result)
		const {
			username,
			password
		} = req.body;
		//if there are no validation errors
		if (validation_result.isEmpty()) {
			//request password from database
			dbConnection.execute('SELECT password, user_id FROM `user_data` WHERE user_name=?', [username], (err, results) => {
				if (err) {
					req.flash('error', 'Database error has occured')
					res.render(path.join(__dirname, 'includes', 'twig_templates', 'login.twig'), );
				}
				return results
			}).then(function(dbhash) {
				//hash provided password and compare to database
				bcrypt.compare(password, dbhash[0][0]['password'], (err, same) => {
					if (err) {
						req.flash('error', 'Error has occured')
						res.render(path.join(__dirname, 'includes', 'twig_templates', 'login.twig'), );
					} else {

						if (same) {
							//login successful
							//set user cookie to session ID
							res.cookie('user_sid', req.sessionID)
							res.end();

							//Store data in session updated
							req.session.userId = dbhash[0][0]['user_id'];
							req.session.username = username;
							req.session.tablescreated = 0;
							req.session.save()
							req.flash('info', 'Login Successful')
							res.redirect('/')

						} else {
							//password incorrect flash message
							req.flash('error', 'PASSWORD INCORRECT')
							res.render(path.join(__dirname, 'includes', 'twig_templates', 'login.twig'), );

						}
					}

				})
			})

		} else {
			//throw errors on login screen by flashing
			let messagestring
			validation_result["errors"].forEach(error => {
				req.flash('error', error["msg"])
			});

			res.render(path.join(__dirname, 'includes', 'twig_templates', 'login.twig'), );

		}
	});




app.post('/addchips', ifNotLoggedin,
	//validation
	[
		//checks if chips requested is between 1 & 10000
		body('chips', 'CHIP AMOUNT MUST BE BETWEEN 1 & 1000').isInt({
			min: 1,
			max: 1000
		})
	],
	(req, res) => {

		const validation_result = validationResult(req);
		console.log(validation_result)
		const {
			chips
		} = req.body;
		//if there are no validation errors
		if (validation_result.isEmpty()) {
			//request password from database
			dbConnection.execute('SELECT chips FROM `balance_data` WHERE user_id=?', [req.session.userId], (err, results) => {
				if (err) {
					console.log(err)
					req.flash('error', 'Database error has occured')
					res.redirect("/lobby")
				}

				return results
			}).then(function(userchipsdata) {
				let chipsinplay = 0;
				for (let key of Object.keys(rooms)) {
					let playerseat = rooms[key].findPlayerById(req.session.userId);
					if (playerseat) {
						chipsinplay = rooms[key].getUserBalance(playerseat);
						break;
					}
				}
				if (userchipsdata[0][0]["chips"] + chipsinplay < 1000) {
					let updatechips = 'UPDATE `balance_data` SET chips = chips + ' + chips + ' WHERE user_id=' + req.session.userId;
					dbConnection.execute(updatechips, (err, results) => {

						if (err) {

							req.flash('error', 'Database error occurred');
							res.redirect("/lobby")
						} else {
							req.flash('notify', 'CHIPS ADDED')
							res.redirect("/lobby")
						}

					})

				} else {
					req.flash('error', 'YOU HAVE TOO MANY CHIPS TO ADD ON')
					res.redirect("/lobby")
				}

			})

		} else {
			//throw errors on login screen by flashing
			validation_result["errors"].forEach(error => {
				req.flash('error', error["msg"])
			});

			res.redirect("/lobby")

		}
	}
);