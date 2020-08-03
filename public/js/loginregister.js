if (document.getElementById("loginbutton")) {
	document.getElementById("loginbutton").onclick = function() {
		window.location.href = "/login";
	}
}
if (document.getElementById("signup")) {
	document.getElementById("signup").onclick = function() {
		window.location.href = "/register";
	}
}