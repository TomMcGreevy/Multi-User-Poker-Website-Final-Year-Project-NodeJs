let socket = io.connect('http://localhost:4569');
socket.on('connection', data => {
	console.log(data);
})
socket.on('redirect', data => {
	window.location.href = data;
})
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
socket.on('confirmation', data => {
	console.log(data)
	document.getElementById("info").innerHTML = data;
	if (document.getElementById("info").classList.contains("showmessages")) {
		document.getElementById("info").classList.remove("showmessages")
		setTimeout(() => {
			document.getElementById("info").classList.add("showmessages")
		}, 1000);
	} else {
		document.getElementById("info").classList.add("showmessages")
	}
})
const buyinform = document.getElementById("buyinbox")
buyinform.addEventListener("submit", event => {
	event.preventDefault()
	tableid = document.getElementById("tableid_space").value;
	chips = document.getElementById("chips_space").value;
	console.log(chips)
	socket.emit('join_table', tableid, chips)
})

const createtableform = document.getElementById("formbox")
createtableform.addEventListener("submit", event => {
	event.preventDefault()
	let newtabledetails = {}
	newtabledetails.bigblind = document.getElementById("big_blinds_space").value;
	newtabledetails.seats = document.getElementById("seats_space").value;
	console.log(newtabledetails)
	socket.emit('createtable', newtabledetails)
})

const tables = document.querySelector("#games > tbody");

function getjson() {
	const request = new XMLHttpRequest();
	request.open("get", "/games/games.json");
	request.onload = () => {
		const json = JSON.parse(request.responseText);
		populatetable(json);
	}
	request.send();
}
document.addEventListener("DOMContentLoaded", () => {
	getjson();
})
setInterval(function() {
	getjson();
}, 5000);

// populates table with rows from games.json + adds a join button to every row
function populatetable(json) {
	while (tables.firstChild) {
		tables.removeChild(tables.firstChild);

	}

	json.forEach((row) => {
		const tr = document.createElement("tr");

		for (let key of Object.keys(row)) {
			const td = document.createElement("td");
			if (key == "big_blinds") {
				td.textContent = row[key] + " / " + row[key] / 2
			} else {
				td.textContent = row[key];
			}
			tr.appendChild(td);
		}
		const joinbutton = document.createElement('input');
		joinbutton.type = "button";
		joinbutton.class = "button";
		joinbutton.value = "Join Table";
		joinbutton.style.backgroundColor = "#98ccf9";
		joinbutton.style.borderRadius = "4px";
		joinbutton.style.fontFamily = "Segoe UI Historic";
		joinbutton.style.color = "#43425d";
		joinbutton.style.border = "1px solid black"
		joinbutton.width = "10vw";
		joinbutton.style.cursor = "pointer";
		joinbutton.onclick = function() {
			let tableid = joinbutton.closest("tr").firstChild.textContent;
			document.getElementById("tableid_space").setAttribute("value", tableid);
			document.getElementById("tableid_space").style.width = "fit-content"
			document.getElementById("blur").style.filter = "blur(5px)";
			document.getElementById("guide").style.filter = "blur(5px)";
            document.getElementById("buyinbox").style.transform = "scale(1)";
		};
		const finalcolumn = document.createElement("td")
		finalcolumn.appendChild(joinbutton);
		tr.appendChild(finalcolumn);
		tables.appendChild(tr);
	});
}

document.getElementById("closeimg").onclick = function() {
	document.getElementById("buyinbox").style.transform = "scale(0)";
	document.getElementById("blur").style.filter = "blur(0px)";
	document.getElementById("guide").style.filter = "blur(0px)";
}

document.getElementById("addchips").onclick = function() {
	document.getElementById("blur").style.filter = "blur(5px)";
	document.getElementById("guide").style.filter = "blur(5px)";
	document.getElementById("addchipsbox").style.transform = "scale(1)";
};

document.getElementById("closeimg2").onclick = function() {
	document.getElementById("addchipsbox").style.transform = "scale(0)";
	document.getElementById("blur").style.filter = "blur(0px)";
	document.getElementById("guide").style.filter = "blur(0px)";
}

document.getElementById("logout").onclick = function() {
	window.location.href = "/logout";
};