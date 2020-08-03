module.exports = class Deck {
	deck
	dealt_cards
	// Creates an array to contain the state of the deck of cards and a list of cards that have been dealt
	constructor() {
		this.deck = []
		this.dealt_cards = []
	}
	// Generates a 52 card standard Deck
	generate_deck() {
		this.deck = [];
		let card = (suit, value) => {
			this.suit = suit;
			this.value = value;

			return {
				suit: this.suit,
				value: this.value
			}
		}
		let values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14']
		let suits = ['Spades', 'Clubs', 'Hearts', 'Diamonds']

		for (let slcv = 0; slcv < suits.length; slcv++) {
			for (let vlcv = 0; vlcv < values.length; vlcv++) {
				this.deck.push(card(suits[slcv], values[vlcv]))
			}
		}
		this.dealt_cards = [];
	}

	/* Dealing functions */
	pop_card() {
		this.dealt_cards.push(this.deck.pop());
		return this.dealt_cards[this.dealt_cards.length - 1]
	}
	deal_turnriver() {
		this.dealt_cards.push(this.deck.pop());

		this.dealt_cards.push(this.deck.pop());
		return this.dealt_cards[this.dealt_cards.length - 1]
	}
	deal_flop() {
		this.dealt_cards.push(this.deck.pop());

		this.dealt_cards.push(this.deck.pop());
		this.dealt_cards.push(this.deck.pop());
		this.dealt_cards.push(this.deck.pop());

		return [this.dealt_cards[this.dealt_cards.length - 1], this.dealt_cards[this.dealt_cards.length - 2], this.dealt_cards[this.dealt_cards.length - 3]]
	}

	// Shuffles the current deck, moving all cards into a random position
	shuffle_deck() {
		let temp_val
		let rand_ind

		for (let lcv = this.deck.length - 1; lcv > 0; lcv--) {
			rand_ind = Math.floor(Math.random() * lcv);
			temp_val = this.deck[lcv]
			this.deck[lcv] = this.deck[rand_ind]
			this.deck[rand_ind] = temp_val
		}
	}

	/* Get Methods */
	get_deck() {
		return this.deck
	}

	get_dealtcards() {
		return this.dealt_cards
	}

}