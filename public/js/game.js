let socket = io.connect('http://localhost:4569');
socket.on('connection', data => {


	console.log(data);
})

window.addEventListener('DOMContentLoaded', (event) => {
	socket.emit('initialise_table');
})
let slider = document.getElementById("myRange")
let raisebutton = document.getElementById("btn_raise")
raisebutton.value = "Raise: " + slider.value;
slider.onchange = function() {
	raisebutton.value = "Raise: " + slider.value;
}
socket.on('init_table_details', data => {
	console.log("new")
	console.log(data)
	let playerpositionarray = data;
	for (let key of Object.keys(playerpositionarray)) {
		if (key == '1') {
			if (playerpositionarray[key][2] != 0) {
				document.getElementById('seat' + key + "bets").style.transform = "scale(1)";
				document.getElementById('seat' + key + "bets").innerHTML = playerpositionarray[key][2];
			} else {
				document.getElementById('seat' + key + "bets").style.transform = "scale(0)";
			}
			document.getElementById('seat' + key + "chips").innerHTML = playerpositionarray[key][0] + " Chips";
			let raisemin = 0;
			let bb
			for (let key of Object.keys(playerpositionarray)) {
				if (raisemin < playerpositionarray[key][6] / 2) {
					bb = playerpositionarray[key][6];
				}
				if (playerpositionarray[key][2] > raisemin) {
					raisemin = playerpositionarray[key][2];
				}
			}

			console.log(raisemin)
			document.getElementById("myRange").max = Number(playerpositionarray['1'][0] + playerpositionarray['1'][2]);

			//if it equals 0 then make min into 1 big
			document.getElementById("myRange").min = raisemin + bb;
			slider.value = raisemin + bb;
			raisebutton.value = "Raise: " + slider.value;




		} else if (playerpositionarray[key] == false) {
			document.getElementById('seat' + key).style.transform = "scale(0)";
			document.getElementById('seat' + key + "bets").style.transform = "scale(0)";
			document.getElementById('seat' + key + "container").style.transform = "scale(0)";

		} else {
			document.getElementById('seat' + key).style.transform = "scale(1)";
			document.getElementById('seat' + key + "chips").style.transform = "scale(1)";
			document.getElementById('seat' + key + "chips").innerHTML = playerpositionarray[key][1] + ": " + playerpositionarray[key][0] + " Chips";
			if (playerpositionarray[key][2] != 0) {
				document.getElementById('seat' + key + "bets").style.transform = "scale(1)";
				document.getElementById('seat' + key + "bets").innerHTML = playerpositionarray[key][2];
			} else {
				document.getElementById('seat' + key + "bets").style.transform = "scale(0)";
			}

			if (playerpositionarray[key][4] == false && playerpositionarray[key][5].length == 0) {
				document.getElementById('seat' + key + "container").style.transform = "scale(1)";
				document.getElementById('seat' + key + "card1").style.background = "url('../../media/assets/game/cards/card_back.png') no-repeat center"
				document.getElementById('seat' + key + "card1").style.backgroundSize = "auto 17vh"
				document.getElementById('seat' + key + "card2").style.background = "url('../../media/assets/game/cards/card_back.png') no-repeat center"
				document.getElementById('seat' + key + "card2").style.backgroundSize = "auto 17vh"


			} else if (playerpositionarray[key][4] == false && playerpositionarray[key][5].length > 0) {
				console.log(key)
				document.getElementById('seat' + key + "container").style.transform = "scale(1)";
				document.getElementById("seat" + key + "card1").style.background = "url('../../media/assets/game/cards/card_b_" + playerpositionarray[key][5][0]["suit"][0] + playerpositionarray[key][5][0]["value"] + "_large.png') no-repeat center"
				document.getElementById("seat" + key + "card2").style.background = "url('../../media/assets/game/cards/card_b_" + playerpositionarray[key][5][1]["suit"][0] + playerpositionarray[key][5][1]["value"] + "_large.png') no-repeat center"
				document.getElementById("seat" + key + "card1").style.backgroundSize = "auto 17vh"
				document.getElementById("seat" + key + "card2").style.backgroundSize = "auto 17vh"


			} else {
				document.getElementById('seat' + key + "container").style.transform = "scale(0)";
			}

		}
	}


});
socket.on('continuegamebounceback', function(id) {
	socket.emit('continuegame', id)
})
socket.on('startgamebounceback', function(id) {
	socket.emit('begingame', id)
})
socket.on('initbounceback', function() {
	socket.emit('initialise_table');
})

socket.on('private_cards', function(private) {
	console.log("hello")
	console.log(private)
	document.getElementById("card1").style.transform = "scale(1)"
	document.getElementById("card2").style.transform = "scale(1)"
	document.getElementById("card1").style.background = "url('../../media/assets/game/cards/card_b_" + private[0] + "_large.png') no-repeat center"
	document.getElementById("card1").style.backgroundSize = "100% 100%"
	document.getElementById("card1").style.height = "23.2vh"
	document.getElementById("card1").style.width = "18.025vh"
	document.getElementById("card2").style.background = "url('../../media/assets/game/cards/card_b_" + private[1] + "_large.png') no-repeat center"
	document.getElementById("card2").style.backgroundSize = "100% 100%"
})
socket.on('showoptions', (positionarray, callback) => {
	console.log(positionarray)
	highestAmount = 0;
	for (let key of Object.keys(positionarray)) {
		if (positionarray[key][2] > highestAmount) {
			highestAmount = positionarray[key][2];
		}
	}

	if (Number(highestAmount) > Number(positionarray['1'][2])) {
		document.getElementById("btn_checkcall").value = "Call"
	} else {
		document.getElementById("btn_checkcall").value = "Check"
	}
	document.getElementById("slidercontainer").style.transform = "scale(1)"
	document.getElementById("betbuttons").style.transform = "scale(1)"
	document.getElementById("btn_checkcall").onclick = function() {
		console.log("button pressed")
		callback("Check / Call")
	}

	document.getElementById("btn_raise").onclick = function() {
		console.log("button pressed")
		console.log(slider.value)
		//need to look at this value doesnt get received
		callback([slider.value])
	}

	document.getElementById("btn_fold").onclick = function() {
		console.log("button pressed")
		callback("Fold")
	}

})
socket.on('hideoptions', function() {
	document.getElementById("slidercontainer").style.transform = "scale(0)"
	document.getElementById("betbuttons").style.transform = "scale(0)"
})

socket.on('folded', function() {
	document.getElementById("card1").style.transform = "scale(0)"
	document.getElementById("card2").style.transform = "scale(0)"
})



socket.on('init_community', community => {
	let pot = community['pot']
	let cards = community['cards']
	document.getElementById("pot").innerHTML = "Pot: " + pot['1'];
	console.log(cards)
	if (cards.length > 0) {
		for (let lcv = 0; lcv < cards[0].length; lcv++) {
			let card = cards[0][lcv]["suit"][0] + cards[0][lcv]["value"]
			document.getElementById("communitycard" + (lcv + 1)).style.background = "url('../../media/assets/game/cards/card_b_" + card + "_large.png') no-repeat center";
			document.getElementById("communitycard" + (lcv + 1)).style.backgroundSize = "100% 100%"
		}
	} else {
		for (let lcv = 0; lcv < 5; lcv++) {
			document.getElementById("communitycard" + (lcv + 1)).style.backgroundSize = "0% 0%"
		}
	}
})
document.getElementById("back").onclick = function() {
	socket.emit('leave_room', (err, callback) => {

		window.location.href = "/lobby";
	})
};

socket.on('errormessage', data => {
	document.getElementById("error").innerHTML = data;
	if (document.getElementById("error").classList.contains("showmessages")) {
		document.getElementById("error").classList.remove("showmessages")
		setTimeout(() => {
			document.getElementById("error").classList.add("showmessages")
		}, 1000);
	} else {
		document.getElementById("error").classList.add("showmessages")
	}
})