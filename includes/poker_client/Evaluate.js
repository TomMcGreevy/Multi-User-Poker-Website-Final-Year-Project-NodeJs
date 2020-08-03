module.exports = class Evaluate {
	constructor() {

	}
	Evaluate(handseatarray, communitycards) {
		let result = {
			'1': {},
			'2': {},
			'3': {},
			'4': {},
			'5': {},
			'6': {},
			'7': {},
			'8': {},
			'9': {}
		}
		// handseatarray [Seat1: Player, Seat 2 Player, Seat 7 Player]


		// creates an array containing the suits and values of each community card
		let communitysuits = [];
		let communityvalues = [];
		for (let lcv = 0; lcv <= 4; lcv++) {
			communitysuits.push(communitycards[lcv]["suit"])
			communityvalues.push(communitycards[lcv]["value"])
		}
		// --shows count for each suit on community and pairs 
		let suitcounts = {};
		let paircounts = {};

		for (let lcv = 0; lcv < communitysuits.length; lcv++) {
			let suit = communitysuits[lcv];
			suitcounts[suit] = suitcounts[suit] ? suitcounts[suit] + 1 : 1;
		}
		for (let lcv = 0; lcv < communityvalues.length; lcv++) {
			let value = communityvalues[lcv];
			paircounts[value] = paircounts[value] ? paircounts[value] + 1 : 1;
		}
		// variables show if a flush or full house / quads is possible
		let flush = suitcounts["Diamonds"] >= 3 || suitcounts["Clubs"] >= 3 || suitcounts["Hearts"] >= 3 || suitcounts["Spades"] >= 3;
		let paired = false


		for (let key of Object.keys(paircounts)) {

			if (paircounts[key] >= 2) {
				paired = true;
			}
		}


		//gets players cards
		for (let key of Object.keys(handseatarray)) {
			let card1 = handseatarray[key].getCards()[0];
			let card2 = handseatarray[key].getCards()[1];

			//creates a combination of 7 cards 
			let sevencardcombo = Object.assign([], communitycards);
			sevencardcombo.push(card1);
			sevencardcombo.push(card2);
			let playerflush

			if (flush == true) {
				let hearts = [];
				let spades = [];
				let clubs = [];
				let diamonds = [];
				//sorts each card value into suit array to check for royal flush and to gather which has the highest flush card
				sevencardcombo.forEach(card => {
					if (card["suit"] == 'Hearts') {
						hearts.push(Number(card["value"]))
					} else if (card["suit"] == 'Spades') {
						spades.push(Number(card["value"]))
					} else if (card["suit"] == 'Clubs') {
						clubs.push(Number(card["value"]))
					} else if (card["suit"] == 'Diamonds') {
						diamonds.push(Number(card["value"]))
					}
				});

				hearts.sort((a, b) => a - b);
				spades.sort((a, b) => a - b);
				clubs.sort((a, b) => a - b);
				diamonds.sort((a, b) => a - b);

				/*checks if the player has a flush and populates flush with an array of the highcards and checks for straight flush 
				and populates straightflush with highcard*/
				let playerstraightflush

				if (hearts.length >= 5) {
					playerflush = Object.assign([], hearts).sort((a, b) => a - b);
					playerstraightflush = findFiveConsecutive(hearts)

				} else if (spades.length >= 5) {
					playerflush = Object.assign([], spades).sort((a, b) => a - b);
					playerstraightflush = findFiveConsecutive(spades)

				} else if (clubs.length >= 5) {
					playerflush = Object.assign([], clubs).sort((a, b) => a - b);
					playerstraightflush = findFiveConsecutive(clubs)

				} else if (diamonds.length >= 5) {
					playerflush = Object.assign([], diamonds).sort((a, b) => a - b);
					playerstraightflush = findFiveConsecutive(diamonds)

				}

				if (playerstraightflush != null) {
					result['1'][key] = Object.assign(playerstraightflush)

					continue
				}

			};

			// Creates keys for each 7 cards + number of occurences for pairs / full houses etc
			let sevencardpairscount = Object.assign({}, paircounts);
			sevencardpairscount[card1["value"]] = sevencardpairscount[card1["value"]] ? sevencardpairscount[card1["value"]] + 1 : 1;
			sevencardpairscount[card2["value"]] = sevencardpairscount[card2["value"]] ? sevencardpairscount[card2["value"]] + 1 : 1;
			let playerhighcard = Object.keys(sevencardpairscount)
			for (let key of Object.keys(sevencardpairscount)) {
				if (Number(sevencardpairscount[key]) >= 2) {
					let arraypos = playerhighcard.indexOf(key);
					if (arraypos !== -1) playerhighcard.splice(arraypos, 1);
				}
			}


			if (paired == true) {

				//Does Player have four of a kind?
				let playerfourofakind
				//If the seven card combo has a four of a kind playerfourofakind will be set to the card they have four of a kind of.
				for (let key of Object.keys(sevencardpairscount)) {
					if (sevencardpairscount[key] == 4) {
						playerfourofakind = key;
					}
				}
				if (playerfourofakind != null) {
					result['2'][key] = [Object.assign(playerfourofakind), playerhighcard[playerhighcard.length - 1]].map(function(element) {
						return Number(element)
					})

					continue
				}
			}

			let playerthreeofakind
			let playerhighpair
			let playersecondpair

			for (let key of Object.keys(sevencardpairscount)) {
				//assigns playerthreeofakind to value of three of a kind, if there are two then lowest becomes highest pair for fullhouse
				if (sevencardpairscount[key] == 3) {
					if (playerthreeofakind == null) {
						playerthreeofakind = key;
					} else if (Number(playerthreeofakind) < Number(key)) {
						playerhighpair = Object.assign(playerthreeofakind);
						playerthreeofakind = key;
					} else if (Number(playerthreeofakind) > Number(key)) {
						playerhighpair = key;
					}
				}
				//assigns playerhighpair and second pair
				else if (sevencardpairscount[key] == 2) {
					if (playerhighpair == null) {
						playerhighpair = Object.assign(key);
					} else if (Number(playerhighpair) < Number(key)) {
						playersecondpair = Object.assign(playerhighpair)
						playerhighpair = Object.assign(key);
					} else if (Number(playerhighpair) > Number(key)) {
						if (playersecondpair == null) {
							playersecondpair = Object.assign(key);
						} else {
							if (Number(playersecondpair) < Number(key)) {
								playersecondpair = Object.assign(key);
							}
						}
					}
				}

			}

			if (playerthreeofakind != null && playerhighpair != null) {

				result['3'][key] = Object.assign([playerthreeofakind, playerhighpair]).map(function(element) {
					return Number(element)
				})

				continue
			}
			if (playerflush != null) {
				result['4'][key] = Object.assign([], playerflush.sort((a, b) => a - b)).reverse()

				continue
			}
			let findstraight = Object.keys(sevencardpairscount)
			if (findstraight.includes(13)) {
				findstraight.push(1);
			}
			findstraight = findstraight.map(function(element) {
				return Number(element)
			})


			let playerstraight = findFiveConsecutive(findstraight);
			if (playerstraight != null) {
				result['5'][key] = Object.assign(playerstraight)

				continue
			}

			if (playerthreeofakind != null) {
				result['6'][key] = [Object.assign(playerthreeofakind), playerhighcard[playerhighcard.length - 1], playerhighcard[playerhighcard.length - 2]].map(function(element) {
					return Number(element)
				});

				continue
			}

			if (playersecondpair != null && playerhighpair != null) {
				let twopair = Object.assign([playersecondpair, playerhighpair])
				twopair.push(playerhighcard[playerhighcard.length - 1]);
				result['7'][key] = Object.assign(twopair).map(function(element) {
					return Number(element)
				});

				continue
			}

			if (playerhighpair != null) {
				result['8'][key] = [Object.assign(playerhighpair), playerhighcard[playerhighcard.length - 1], playerhighcard[playerhighcard.length - 2], playerhighcard[playerhighcard.length - 3]].map(function(element) {
					return Number(element)
				})

				continue
			} else {
				result['9'][key] = [playerhighcard[playerhighcard.length - 1], playerhighcard[playerhighcard.length - 2], playerhighcard[playerhighcard.length - 3], playerhighcard[playerhighcard.length - 4], playerhighcard[playerhighcard.length - 5]].map(function(element) {
					return Number(element)
				})

			}

		}
		let winnerorder = [];
		for (let key of Object.keys(result)) {
			let temparray = JSON.parse(JSON.stringify(result[key]))

			if (Object.keys(result[key]).length == 1) {
				winnerorder.push(Object.keys(temparray));
			} else if (Object.keys(result[key]).length > 1) {

				switch (key) {
					case '1':
						for (let lcv = 0; lcv <= Object.keys(temparray).length; lcv++) {

							let winnerkeyvalue = temparray[Object.keys(temparray).reduce((a, b) => (temparray[a] > temparray[b] ? a : b)).toString()]
							let winnerkeyarray = [];

							Object.keys(temparray).forEach(function(element) {
								if (temparray[element] == winnerkeyvalue) {
									winnerkeyarray.push(element.toString())
								}
							})

							winnerorder.push(winnerkeyarray)
							winnerkeyarray.forEach(function(element) {
								delete temparray[element]
							})

						}
						break;

					case '5':
						for (let lcv = 0; lcv <= Object.keys(temparray).length; lcv++) {

							let winnerkeyvalue = temparray[Object.keys(temparray).reduce((a, b) => (temparray[a] > temparray[b] ? a : b)).toString()]
							let winnerkeyarray = [];

							Object.keys(temparray).forEach(function(element) {
								if (temparray[element] == winnerkeyvalue) {
									winnerkeyarray.push(element.toString())
								}
							})

							winnerorder.push(winnerkeyarray)
							winnerkeyarray.forEach(function(element) {
								delete temparray[element]
							})

						}

						break;
					default:
						for (let lcv = 0; lcv <= Object.keys(temparray).length; lcv++) {
							let lcv2 = 0;
							let winnerkeyvalue = temparray[Object.keys(temparray).reduce((a, b) => (temparray[a][lcv2] > temparray[b][lcv2] ? a : b)).toString()][0]
							let winnerkeyarray = [];
							Object.keys(temparray).forEach(function(element) {
								if (temparray[element][0] == winnerkeyvalue) {
									winnerkeyarray.push(element.toString())
								}
							})

							while (winnerkeyarray.length != 1 && lcv2 < temparray[winnerkeyarray[0]].length) {
								let temparray2 = {};
								winnerkeyarray.forEach(function(element) {
									temparray2[element] = temparray[element];
								})

								lcv2 += 1;
								let tempwinnerkeyarray = []
								let winnerkeyvalue2 = temparray[Object.keys(temparray).reduce((a, b) => (temparray[a][lcv2] > temparray[b][lcv2] ? a : b)).toString()][lcv2]
								Object.keys(temparray2).forEach(function(element) {
									if (temparray2[element][lcv2] == winnerkeyvalue2) {
										tempwinnerkeyarray.push(element.toString())
									}
								})
								winnerkeyarray = tempwinnerkeyarray;
							}




							winnerorder.push(winnerkeyarray)
							winnerkeyarray.forEach(function(element) {
								delete temparray[element]
							})

						}

						break;


				}
			}

		}


		return winnerorder

	}



}
	// checks an ordered array to see if there are 5 consecutive numbers and returns the highest card of that consecutive
function findFiveConsecutive(array) {
	for (let lcv = array.length; lcv >= 0; lcv--) {
		if (array[lcv] % array[lcv - 1] == 1 && array[lcv] / array[lcv - 1] <= 2) {

			if (array[lcv - 1] % array[lcv - 2] == 1 && array[lcv - 1] / array[lcv - 2] <= 2) {

				if (array[lcv - 2] % array[lcv - 3] == 1 && array[lcv - 2] / array[lcv - 3] <= 2) {

					if (array[lcv - 3] % array[lcv - 4] == 1 && array[lcv - 3] / array[lcv - 4] <= 2) {

						return array[lcv]

					}

				}
			}
		}
	}
}