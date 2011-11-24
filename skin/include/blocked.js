var blocked_target = null;

function blocked_info()
{
	if (blocked_target) {
		location.href = "http://www.mywot.com/scorecard/" + blocked_target;
	}
}

function blocked_addclass(elem, name)
{
	elem.setAttribute("class", elem.getAttribute("class") + " " + name);
}

function blocked_sethtml(a, b) {
	document.getElementById(a).innerHTML =
		document.getElementById(b).innerHTML;
}

function blocked_load()
{
	if (!window.location.search) {
		return;
	}

	var query = atob(decodeURIComponent(window.location.search.substr(1)));
	var m = /target=([^&]*)/.exec(query);

	if (m && m[1]) {
		blocked_target = m[1];

		var elem = document.getElementById("wotwebsite");
		elem.innerHTML = blocked_target;
		elem.setAttribute("title", blocked_target);
	}

	var ratings = false;
	var reasons = {
		reputation: false,
		userrating: false
	};

	var apps = [ 0, 1, 2, 4 ];

	for (var i = 0; i < apps.length; ++i) {
		var rating = document.getElementById("wotrating" + apps[i]);
		var r = -1;
		
		m = RegExp(apps[i] + "=([^&]*)").exec(query);

		if (m && m[1] != null) {
			for (r = 5; r > 0; --r) {
				if (m[1].indexOf(r) >= 0) {
					blocked_addclass(rating, "wotreputation" + r);
					blocked_sethtml("wotratingexpl" + apps[i],
						"wottextreputation" + r);
					break;
				}
			}

			if (m[1].indexOf("x") >= 0) {
				blocked_addclass(rating, "wotreputationx");
			}

			if (m[1].indexOf("y") >= 0) {
				reasons.userrating = true;
			} else if (m[1].indexOf("r") >= 0 && r > 0) {
				reasons.reputation = true;
			}

			if (m[1].indexOf("a") >= 0) {
				blocked_addclass(rating, "wotaccessible");
			}
		}

		if (r < 0) {
			rating.style.display = "none";
		} else {
			ratings = true;
		}
	}

	if (!ratings || (reasons.userrating && !reasons.reputation)) {
		blocked_addclass(document.getElementById("wotcontainer"),
			"wotnoratings");
	}

	if (!reasons.reputation) {
		if (reasons.userrating) {
			blocked_addclass(document.getElementById("wotdescriptiontext"),
				"wotlongdescription");
			blocked_sethtml("wotdescriptiontext", "wottextdescuserrat");
		} else {
			blocked_sethtml("wotdescriptiontext", "wottextdescunknown");
		}
	}
}
