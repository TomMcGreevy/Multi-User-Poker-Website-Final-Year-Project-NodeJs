module.exports = class Game {

	Deck = require(__dirname + '\\Deck.js');
	Evaluate = require(__dirname + '\\Evaluate.js');
	playerposition
	deck = new this.Deck();
	evaluator = new this.Evaluate();
	communitycards
	bigblind
	smallblind
	buttonposition
	nextbuttonpos
	actionposition
	deadpot
	pot
	playerallin
	handinprogress = false;
	allowAction
	bbaction
	handid
	constructor(seats, bb) {
		this.playerposition = {}
		for (let lcv = 1; lcv <= seats; lcv++) {
			this.playerposition[lcv.toString()] = 'Empty';
		}
		this.bigblind = Number(bb);
		this.smallblind = bb / 2;
		this.deck.generate_deck();
		this.deck.shuffle_deck();
		this.buttonposition = Math.floor(Math.random() * (seats - 1)) + 1;
		this.pot = {
			'1': 0
		}
		this.deadpot = 0;
		this.actionposition = 0;
		this.allowAction = true
		this.bbaction = false;
		this.communitycards = [];
		this.playerallin = [];
		this.handid = 0;
	}

	toString() {
		return this.playerposition;
	}
	//Adds given player to next available spot
	addPlayer(player) {
		let playeradded = false;
		for (let lcv = 1; lcv <= Object.keys(this.playerposition).length; lcv++) {
			if (playeradded == false) {
				if (this.playerposition[lcv.toString()] == 'Empty') {
					this.playerposition[lcv.toString()] = player;
					playeradded = true;
					return lcv;
				}
			}
		}
	}
	//Takes chips from player and adds to pot
	playerBet(position, chips, pot) {
		let playerbet = this.playerposition[position.toString()].takeChips(chips);
		if (playerbet[0] == 'Player all in') {
			this.pot[pot.toString()] += playerbet[1];
			this.playerallin.push(position.toString())
		} else if (playerbet[0] == chips) {
			this.pot[pot.toString()] += playerbet[0];
		} else if (playerbet[0] == 'Under Call') {
			this.pot[pot.toString()] += playerbet[1]
			this.playerallin.push(position.toString());

		}
	}
	playerLeave(seat) {
		this.playerposition[seat] = 'Empty';
	}
	//Finds the players that should pay the big blind / small blind then deals cards to everyone on the table
	dealCards() {
		this.pot = {
			'1': 0
		}
		this.deck.generate_deck();
		this.deck.shuffle_deck()
		for (let key of Object.keys(this.playerposition)) {
			if (this.playerposition[key] != 'Empty') {
				this.playerposition[key].clearCards()
			}
		}
		this.handinprogress = true;
		let buttonpos = this.buttonposition;
		let blindtaken = 0;
		//logic to change the way action is taken headsup
		let playercount = 0
		for (let key of Object.keys(this.playerposition)) {
			if (this.playerposition[key] != 'Empty') {
				playercount += 1;
			}
		}

		//first loop of table will collect blinds
		for (let lcv = buttonpos + 1; lcv <= Object.keys(this.playerposition).length; lcv++) {
			if (this.playerposition[lcv.toString()] != 'Empty') {
				playercount++

				if (blindtaken == 0) {
					let takenchips = this.playerposition[lcv.toString()].takeChips(this.smallblind);
					this.nextbuttonpos = lcv.toString()

					if (isNaN(takenchips[0])) {
						//either player is all in
					} else {
						this.pot['1'] += takenchips[0]
					}
					blindtaken += 1;
				} else if (blindtaken == 1) {
					let takenchips2 = this.playerposition[lcv.toString()].takeChips(this.bigblind);
					if (isNaN(takenchips2[0])) {
						//either player is all in
					} else {
						this.pot['1'] += takenchips2[0]
						//sets actionposition to the position after the big

						this.actionposition = (lcv + 1) % Object.keys(this.playerposition).length;
						if (this.actionposition == 0) {
							this.actionposition = Object.keys(this.playerposition).length;

						}

					}

					blindtaken += 1;
				}
				this.playerposition[lcv.toString()].addCard(this.deck.pop_card());
				this.playerposition[lcv.toString()].fold(false)
			}

		}
		for (let lcv = 1; lcv <= buttonpos; lcv++) {

			if (this.playerposition[lcv.toString()] != 'Empty') {
				playercount++
				if (blindtaken == 0) {
					let takenchips = this.playerposition[lcv.toString()].takeChips(this.smallblind);
					this.nextbuttonpos = lcv.toString()

					if (isNaN(takenchips[0])) {
						//either player is all in
					} else {
						this.pot['1'] += takenchips[0]
					}
					blindtaken += 1;
				} else if (blindtaken == 1) {
					let takenchips2 = this.playerposition[lcv.toString()].takeChips(this.bigblind);
					if (isNaN(takenchips2[0])) {
						//either player is all in
					} else {
						this.pot['1'] += takenchips2[0]

						//sets actionposition to the position after the big
						this.actionposition = (lcv + 1) % Object.keys(this.playerposition).length;
						if (this.actionposition == 0) {
							this.actionposition = Object.keys(this.playerposition).length;

						}


					}
					blindtaken += 1;
				}
				this.playerposition[lcv.toString()].addCard(this.deck.pop_card());
				this.playerposition[lcv.toString()].fold(false)
			}
			this.bbaction = this.actionposition - 1
			if (this.bbaction == 0) {
				this.bbaction = (Object.keys(this.playerposition).length).toString();

			}


		}
		//second pass just deals cards
		for (let lcv = buttonpos + 1; lcv <= Object.keys(this.playerposition).length; lcv++) {
			if (this.playerposition[lcv.toString()] != 'Empty') {
				this.playerposition[lcv.toString()].addCard(this.deck.pop_card());
			}
		}
		for (let lcv = 1; lcv <= buttonpos; lcv++) {
			if (this.playerposition[lcv.toString()] != 'Empty') {
				this.playerposition[lcv.toString()].addCard(this.deck.pop_card());
			}
		}

	}

	/* Get Methods */
	getHandInProgress() {
		return this.handinprogress;
	}
	getPlayerSid(seat) {
		return this.playerposition[seat].getUserSid(seat);
	}
	getPlayerPositionArray() {
		let positionArray = {};
		for (let key of Object.keys(this.playerposition)) {
			if (this.playerposition[key] != "Empty") {
				positionArray[key] = [this.playerposition[key].getTableBalance(), this.playerposition[key].getUsername(), this.playerposition[key].getAmountWageredRound(), this.playerallin.includes(key), this.playerposition[key].getFolded(), this.playerposition[key].getShownCards(), this.bigblind]

			} else {
				positionArray[key] = false;
			}
		}

		return positionArray
	}
	//gets a customised array where the player at the provided seat is put to position 1
	getCustomPlayerPositionArray(seat) {
		let customPositionArray = {};

		let arraypos = 1;
		let arraypos2 = 1;
		let passes = 0;
		for (let lcv = Number(seat); lcv <= Object.keys(this.playerposition).length; lcv++) {
			if (this.playerposition[lcv.toString()] != 'Empty') {

				customPositionArray[arraypos.toString()] = [this.playerposition[lcv.toString()].getTableBalance(), this.playerposition[lcv.toString()].getUsername(), this.playerposition[lcv.toString()].getAmountWageredRound(), this.playerallin.includes(lcv.toString()), this.playerposition[lcv.toString()].getFolded(), this.playerposition[lcv.toString()].getShownCards(), this.bigblind]
			} else {
				customPositionArray[arraypos.toString()] = false;
			}

			arraypos += 1;
			passes += 1;
		}
		if (seat.toString() != '1') {
			for (let lcv = passes + 1; lcv <= Object.keys(this.playerposition).length; lcv++) {
				if (this.playerposition[arraypos2.toString()] != 'Empty') {
					customPositionArray[lcv] = [this.playerposition[arraypos2.toString()].getTableBalance(), this.playerposition[arraypos2.toString()].getUsername(), this.playerposition[arraypos2.toString()].getAmountWageredRound(), this.playerallin.includes(arraypos2.toString()), this.playerposition[arraypos2.toString()].getFolded(), this.playerposition[arraypos2.toString()].getShownCards(), this.bigblind]

				} else {
					customPositionArray[lcv] = false;
				}
				arraypos2 += 1
			}
		}

		return customPositionArray;
	}
	getPot() {
		return this.pot;
	}
	getPlayerCards(seat) {
		if (this.playerposition[seat].getCards()[0] == null) {
			return false
		} else {
			return this.playerposition[seat].getCards()
		}
	}
	getActionPos() {
		return this.actionposition
	}
	getPlayerFold(seat) {
		return this.playerposition[seat.toString()].getFolded()
	}
	getAllowAction() {
		return this.allowAction;
	}
	getBbAction() {
		return this.bbaction
	}
		getBigBlind() {
		return this.bigblind;
	}
	getCommunityCards() {
		return this.communitycards
	}
		getAllinPlayers() {
		return this.playerallin
	}
	getPlayerActed(seat) {
		return this.playerposition[seat].getActed()
	}
	getButtonPos() {
		return this.buttonposition;
	}
	getAllinPlayers() {
		return this.playerallin
	}
	getUserBalance(seat) {
		return this.playerposition[seat].getTableBalance()
	}
	getHandId() {
		return this.handid;
	}
	findPlayerById(userid) {
		for (let key of Object.keys(this.playerposition)) {
			if (this.playerposition[key] != "Empty") {
				if (this.playerposition[key].getUserId() == userid) {
					return key
				}
			}

		}
		return false
	}
	/* Set Methods */
	setPlayerSid(seat, sid) {
		this.playerposition[seat].setUserSid(sid);
	}	
	setActionPos(newactionpos) {
		if (Number(newactionpos) == Object.keys(this.playerposition).length + 1) {
			this.actionposition = 1;
		} else {
			this.actionposition = Number(newactionpos);
		}

	}
	setAllowAction(boolean) {
		this.allowAction = boolean;
	}

	setBbAction() {
		this.bbaction = true;
	}

	setPlayerActed(seat, boolean) {
		if (boolean) {
			this.playerposition[seat].playerActed();
		} else {
			this.playerposition[seat].resetActed();
		}
	}
	setHandInProgress(boolean) {
		this.handinprogress = boolean
	}
	addToPot(potid, chips) {
		this.pot[potid] += chips;
	}
	/* Reset Methods*/
	resetUserId(seat) {
		this.playerposition[seat].setUserId("");
	}
	resetTableFold() {
		for (let key of Object.keys(this.playerposition)) {
			if (this.playerposition[key] != 'Empty') {
				this.playerFold(key)
			}
		}
	}
	resetPlayerWageredRound() {
		for (let key of Object.keys(this.playerposition)) {
			if (this.playerposition[key] != 'Empty') {
				this.playerposition[key].resetAmountWageredRound();
			}

		}

	}
	resetPlayerWagered() {
		for (let key of Object.keys(this.playerposition)) {
			if (this.playerposition[key] != 'Empty') {
				this.playerposition[key].resetAmountWagered();
			}

		}

	}
	resetPlayerActed() {
		for (let key of Object.keys(this.playerposition)) {
			if (this.playerposition[key] != 'Empty') {
				this.playerposition[key].resetActed();
			}

		}
	}	
	resetTableCards() {
		for (let key of Object.keys(this.playerposition)) {
			if (this.playerposition[key] != 'Empty') {
				this.playerposition[key].clearCards();
				this.playerposition[key].clearShownCards();
			}

		}
	}
	resetUserBalance(seat) {
		this.playerposition[seat].initialiseTableBalance(0)
	}



	/* Misc Game Methods */
	showPlayerCards() {
		for (let key of Object.keys(this.playerposition)) {
			if (this.playerposition[key] != 'Empty') {
				if (this.playerposition[key].getFolded() == false) {

					this.playerposition[key].showCards();

				}
			}
		}

	}
	playerFold(seat) {
		this.playerposition[seat.toString()].fold(true);
	}
	

	dealFlop() {
		this.communitycards.push(this.deck.deal_flop())
	}
	dealTurnRiver() {
		this.communitycards[0].push(this.deck.deal_turnriver())
	}
	resetCommunityCards() {
		this.communitycards = [];
	}

	evaluateHands() {

		let temp_players = {}
		for (let key of Object.keys(this.playerposition)) {
			if (this.playerposition[key] != 'Empty') {
				if (this.playerposition[key].getFolded() == false) {
					temp_players[key] = this.playerposition[key]
				}

			}
		}
		let evaluate_result = this.evaluator.Evaluate(temp_players, this.communitycards[0])
		//seperate pot for each player 
		let playerwagered = {};
		let tempplayerwagered = {};
		for (let key of Object.keys(this.playerposition)) {
			if (this.playerposition[key] != 'Empty') {
				if (this.playerposition[key].getFolded() == false) {
					playerwagered[key] = this.playerposition[key].getAmountWagered();
					tempplayerwagered[key] = this.playerposition[key].getAmountWagered();
				}
			}
		}

		let playerpotvalue = {}
		let playerpotid = Object.keys(playerwagered).length + 1;
		let prevlowestkey = 0;
		for (let key of Object.keys(playerwagered)) {
			let lowestkey = Object.keys(playerwagered).reduce((a, b) => (playerwagered[a] < playerwagered[b] ? a : b)).toString()
			console.log("lowest key:")
			console.log(lowestkey)
			let lowestvalue = playerwagered[lowestkey];
			console.log("lowest value:")
			console.log(lowestvalue)
			console.log(this.pot)
			lowestvalue = lowestvalue - prevlowestkey;
			prevlowestkey += lowestvalue;
			let potvalue = 0;
			for (let key2 of Object.keys(this.playerposition)) {
				if (this.playerposition[key2] != 'Empty') {
					if (this.playerposition[key2].getAmountWagered() < lowestvalue) {
						potvalue += this.playerposition[key2].getAmountWagered()
						this.playerposition[key2].resetAmountWagered()
					} else if (this.playerposition[key2].getAmountWagered() >= lowestvalue) {
						potvalue += lowestvalue;
						this.playerposition[key2].changeAmountWagered(-lowestvalue);
					}
				}

			}
			this.pot[playerpotid] = potvalue;
			playerpotvalue[lowestkey] = Object.assign([], playerpotid, Object.keys(this.pot));
			playerpotid--
			this.pot['1'] -= potvalue;

			delete playerwagered[lowestkey]
			console.log(this.pot)
		}
		console.log(this.pot)
		console.log(playerpotvalue)
		console.log(evaluate_result)
		this.resetPlayerWageredRound;
		evaluate_result.forEach(winningplayerid => {
			if (winningplayerid.length > 1) {
				//if there is a split pot it works out which of the players has a smaller amount of chips wagered
				let tempwinnerwagered = Object.assign(tempplayerwagered);
				console.log(tempwinnerwagered)
				for (let key of Object.keys(tempplayerwagered)) {

					if (winningplayerid.includes(key) == false) {
						delete tempwinnerwagered[key];
					}
				}
				let winningplayersordered = [];
				for (let key of Object.keys(tempwinnerwagered)) {
					winningplayersordered.push([key, tempwinnerwagered[key]])
				}
				winningplayersordered.sort(function(a, b) {
					return a[1] - b[1];
				});

				//then it splits the chips for the player with the lowest amount then splits for each one after going in order
				let lcv = winningplayersordered.length;

				winningplayersordered.forEach(splittingplayer => {
					playerpotvalue[splittingplayer[0]].forEach(pottotake => {

						this.playerposition[splittingplayer[0]].adjustTableBalance(this.pot[pottotake] / lcv)
						this.playerposition[splittingplayer[0]].changeAmountWageredRound(this.pot[pottotake] / lcv)
						this.pot[pottotake] -= this.pot[pottotake] / lcv;


					})
					lcv--
				})
			} else {
				playerpotvalue[winningplayerid[0]].forEach(pottotake => {
					this.playerposition[winningplayerid].adjustTableBalance(this.pot[pottotake])
					this.playerposition[winningplayerid].changeAmountWageredRound(this.pot[pottotake])
					this.pot[pottotake] = 0;
				})
			}
			this.handid += 1;
		})
		this.playerallin = []
	}



	awardPot(seat) {
		this.playerposition[seat].adjustTableBalance(this.pot['1'])
		this.playerposition[seat].changeAmountWageredRound(this.pot['1'])
		this.pot['1'] = 0;
		this.handid += 1;
	}
	clearZeroChipPlayers() {
		let sid = []
		for (let key of Object.keys(this.playerposition)) {
			if (this.playerposition[key] != 'Empty') {
				if (this.playerposition[key].getTableBalance() == 0) {
					sid.push(this.getPlayerSid(key))
					this.playerLeave(key);
				}
			}
		}
		return sid;
	}
	moveButton() {
		this.buttonposition = Number(this.nextbuttonpos)
	}
}