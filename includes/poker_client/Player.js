module.exports = class Player {
	user_id
	username
	table_balance
	cards
	user_sid
	folded
	amount_wagered
	amount_wagered_round
	acted
	shown_cards
	// creates array for player hole cards
	constructor(user_id, username, table_balance = null) {
		this.user_id = user_id;
		this.username = username;
		this.table_balance = Number(table_balance);
		this.cards = []
		this.amount_wagered = 0;
		this.amount_wagered_round = 0;
		this.folded = true;
		this.acted = false;
		this.shown_cards = [];
	}
	// adds a dealt card to players cards array
	addCard(dealtcard) {
		if (this.cards.length < 2) {
			this.cards.push(dealtcard);
		} else {
			throw "player already has 2 cards"
		}

	}

	/* Get Methods */
	getCards() {
		return this.cards
	}
	// gets a players table balance
	getTableBalance() {
		return this.table_balance;
	}
	//sets user id
	getUserId(player) {
		return this.user_id;
	}
	getUsername() {
		return this.username
	}
	//sets user sid
	getUserSid(user_sid) {
		return this.user_sid
	}
	getFolded() {
		return this.folded
	}
	getAmountWagered() {
		return this.amount_wagered
	}
	getAmountWageredRound() {
		return this.amount_wagered_round
	}
	getActed() {
		return this.acted;
	}
	getShownCards() {
		return this.shown_cards
	}

	/* Set Methods */

	//sets user id
	setUserId(player) {
		this.user_id = player;
	}
	//sets user id
	setUserSid(user_sid) {
		this.user_sid = user_sid;
	}

	/* Reset Methods */
	resetAmountWageredRound() {
		this.amount_wagered_round = 0;
	}

	resetAmountWagered() {
		this.amount_wagered = 0;
	}
		resetActed() {
		this.acted = false;
	}

	/* Misc Player Methods */
	// removes cards from players cards array 
	clearCards() {
		this.cards = []
	}
	// sets players table balance
	initialiseTableBalance(balance) {
		this.table_balance = balance;
	}
	// adjusts the players balance
	adjustTableBalance(change) {
		this.table_balance += change;
	}
	takeChips(chips) {
		if (this.table_balance > chips) {
			this.table_balance = this.table_balance - chips;
			this.amount_wagered += chips;
			this.amount_wagered_round += chips;
			return [chips]
		} else if (this.table_balance == chips) {
			this.table_balance = this.table_balance - chips;
			this.amount_wagered += chips;
			this.amount_wagered_round += chips;
			return ['Player all in', chips]
		} else {
			let temp_balance = 0;
			temp_balance += this.table_balance
			this.table_balance = 0;
			this.amount_wagered += temp_balance;
			this.amount_wagered_round += temp_balance;
			return ['Under Call', temp_balance]

		}
	};
	fold(boolean) {
		if (boolean == true) {
			this.clearCards()
		}
		this.folded = boolean;
	}

	changeAmountWagered(amount) {
		this.amount_wagered += amount;
	}

	changeAmountWageredRound(amount) {
		this.amount_wagered_round += amount;
	}
	isAllin() {
		if (this.table_balance == this.amount_wagered) {
			return true
		} else {
			return false
		}
	}

	playerActed() {
		this.acted = true;
	}

	showCards() {
		this.shown_cards = this.cards;
	}
	clearShownCards() {
		this.shown_cards = [];
	}
}