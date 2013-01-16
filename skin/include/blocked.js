/*
 warning.js
 Copyright © 2012 - 2013  WOT Services Oy <info@mywot.com>

 This file is part of WOT.

 WOT is free software: you can redistribute it and/or modify it
 under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 WOT is distributed in the hope that it will be useful, but WITHOUT
 ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
 License for more details.

 You should have received a copy of the GNU General Public License
 along with WOT. If not, see <http://www.gnu.org/licenses/>.
 */

var WOT_QUERY_OK = 1;

var blocked_target = null;

var l10n = {};
var wot_modules = [];

function load_l10n(callback) {
	// loads locale stings for add-on, parse them and store in l10n object
	try {
		xhr = new XMLHttpRequest();
		xhr.open("GET", "chrome://wot/locale/wot.properties", true);

		xhr.onload = function(e) {
			var text = xhr.responseText;

			// detect separator
			var sep = "\r\n";
			if (text.indexOf(sep) < 1) {
				sep = "\n";
			}

			var lines = text.split(sep);
			for(var i=0; i < lines.length; i++) {
				var pair = lines[i].split(" = ", 2);
				l10n[pair[0]] = pair[1];
			}

			callback();
		};

		xhr.send();

	} catch (e) {
		console.log("Exception in blocked.js / load_l10n()");
	}
}

// emulation of original wot_util module
var wot_util = {
	getstring: function(str)
	{
		return l10n[str] || "?!";
	}
};

// stub
var wot_prefs = {
	accessible: false,
	warning_opacity: 1,
	min_confidence_level: 1
};

// stub
var wot_shared = {
	decodehostname: function(s)
	{
		return s;
	}
};

var wot_cache = {
	data: {},
	get: function(name, property)
	{
		return wot_cache.data[property];
	}
};

var wot_browser = {
	show_warning: function(){}  // pure stub. Does nothing.
};

// copy-pasted from core.js - not a best way, I know.
var wot_core = {
	get_level: function(r) {
		if (r >= WOT_MIN_REPUTATION_5) {
			return 5;
		} else if (r >= WOT_MIN_REPUTATION_4) {
			return 4;
		} else if (r >= WOT_MIN_REPUTATION_3) {
			return 3;
		} else if (r >= WOT_MIN_REPUTATION_2) {
			return 2;
		} else if (r >= 0) {
			return 1;
		} else if (r == -1){
			return 0;
		} else {
			return "x";
		}
	}
};

function blocked_info()
{
	if (blocked_target) {
		location.href = "http://www.mywot.com/scorecard/" + blocked_target;
	}
}

function blocked_action() {
	var query = atob(decodeURIComponent(window.location.search.substr(1)));
	var m = /target=([^&]*)/.exec(query);

	if (m && m[1]) {
		blocked_target = m[1];
	}

	var reasons = {
		reputation: false,
		userrating: false,
		reason: WOT_REASON_RATING     // will be set to reason of showing warning
	};

	var apps = [ 0, 1, 2, 4 ];

	for (var i = 0; i < apps.length; ++i) {

		var app = apps[i];
		wot_prefs["warning_type_" + app] = WOT_WARNING_BLOCK;
		wot_prefs["warning_level_" + app] = 40;

		var r = -1;

		m = RegExp(apps[i] + "=([^&]*)").exec(query);

		if (m && m[1] != null) {
			for (r = 5; r > 0; --r) {
				if (m[1].indexOf(r) >= 0) {
					wot_cache.data["reputation_" + app] = r * 20 - 1; //already mapped reputation, unmap it back
					wot_cache.data["confidence_" + app] = 99; // dummy confidence
					wot_prefs["show_application_" + app] = true;
					break;
				}
			}

			if (m[1].indexOf("x") >= 0) {
				wot_cache.data["excluded_" + app] = true;
			}

			if (m[1].indexOf("y") >= 0) {
				reasons.userrating = true;
			} else if (m[1].indexOf("r") >= 0 && r > 0) {
				reasons.reputation = true;
			}

			if (m[1].indexOf("a") >= 0) {
				wot_prefs.accessible = true;
			}
		}
	}

	if (!reasons.reputation) {
		if (reasons.userrating) {
			reasons.reason = WOT_REASON_TESTIMONY;
		} else {
			reasons.reason = WOT_REASON_UNKNOWN;
		}
	}

	var el_wotblocked = document.getElementById("wotblocked");

	if (el_wotblocked) {
		wot_warning.is_blocked = true;
		el_wotblocked.setAttribute("exit_mode", wot_warning.set_exitmode(document));
		wot_warning.load_delayed(true); // init warning with blocked=true flag to hide "Goto the site" button
		wot_warning.add(blocked_target, document, WOT_WARNING_DOM, reasons.reason);
	}
}

function blocked_load()
{
	if (!window.location.search) {
		return;
	}

	load_l10n(blocked_action);
}
