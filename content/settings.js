/*
	settings.js
	Copyright © 2007, 2008, 2009  WOT Services Oy <info@mywot.com>

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

var wot_settings =
{
	disallowed: {
		"witness_key": true
	},

	load_delayed: function()
	{
		try {
			if (this.browser) {
				return;
			}

			/* Hook up event handlers */
			this.browser = document.getElementById("appcontent");

			if (this.browser) {
				this.browser.addEventListener("DOMContentLoaded",
					wot_settings.onload, false);
			}
		} catch (e) {
			dump("wot_settings.load: failed with " + e + "\n");
		}
	},

	unload: function()
	{
		try {
			if (this.browser) {
				this.browser.removeEventListener("DOMContentLoaded",
					wot_settings.onload, false);
				this.browser = null;
			}
		} catch (e) {
			dump("wot_settings.unload: failed with " + e + "\n");
		}
	},

	onload: function(event)
	{
		try {
			if (!event) {
				return;
			}

			var content = event.originalTarget;

			if (!content || !content.location || !content.location.href ||
					!WOT_PREF_TRIGGER.test(content.location.href)) {
				return;
			}

			if (!wot_settings.loadinputs(content) ||
				!wot_settings.loadsearch(content)) {
				return;
			}

			var saveids = [ "wotsave", "wotnext" ];

			for (var i = 0; i < saveids.length; ++i) {
				var save = content.getElementById(saveids[i]);

				if (!save) {
					continue;
				}

				save.addEventListener("click", function(e) {
							wot_settings.onsave(content, e);
						}, false);
			}

			var level = content.getElementById("wotlevel");

			if (level) {
				if (wot_crypto.islevel("registered")) {
					level.setAttribute("level", "registered");
				}
				/* Other levels? */
			}

			wot_settings.addscript(content, "wotsettings_ready();");
		} catch (e) {
			dump("wot_settings.onload: failed with " + e + "\n");
		}
	},

	onsave: function(content, event)
	{
		try {
			var save = content.getElementById("wotsave");

			if (save) {
				var saveclass = save.getAttribute("class");

				if (saveclass && saveclass.indexOf("disabled") >= 0) {
					return;
				}
			}

			var inputs = content.getElementsByTagName("input");

			for (var i = 0; i < inputs.length; ++i) {
				var preftype = inputs[i].getAttribute("wotpref");

				if (!preftype) {
					continue;
				}
				
				var id = inputs[i].getAttribute("id");

				if (!id) {
					continue;
				}

				var type = inputs[i].getAttribute("type");

				if (!type) {
					continue;
				}

				if ((type == "checkbox" || type == "radio") &&
						preftype == "bool") {
					if (!wot_prefs.setBool(id, inputs[i].checked)) {
						dump("wot_settings.onsave: setBool failed for " +
							id + "\n");
					}
				} else {
					var value = inputs[i].getAttribute("value");

					if (!value) {
						if (preftype == "string") {
							value = "";
						} else {
							dump("wot_settings.onsave: no value for " + id + "\n");
							continue;
						}
					}

					if (preftype == "bool") {
						if (!wot_prefs.setBool(id, (value == "true"))) {
							dump("wot_settings.onsave: setBool failed for " +
								id + "\n");
						}
					} else if (preftype == "int") {
						if (!wot_prefs.setInt(id, Number(value))) {
							dump("wot_settings.onsave: setInt failed for " +
								id + " and value " + value + "\n");
						}
					} else if (preftype == "string") {
						if (!wot_prefs.setChar(id, value)) {
							dump("wot_settings.onsave: setChar failed for " +
								id + "\n");
						}
					}
				}
			}
			wot_prefs.flush();
			wot_settings.addscript(content, "wotsettings_saved();");
			return;
		} catch (e) {
			dump("wot_settings.onsave: failed with " + e + "\n");
		}
		try {
			wot_settings.addscript(content, "wotsettings_failed();");
		} catch (e) {
			dump("wot_settings.onsave: failed with " + e + "\n");
		}
	},
	
	addscript: function(content, js)
	{
		try {
			var script = content.createElement("script");

			script.setAttribute("type", "text/javascript");
			script.innerHTML = js;

			var body = content.getElementsByTagName("body");

			if (body && body.length > 0) {
				body[0].appendChild(script);
			}
		} catch (e) {
			dump("wot_settings.addscript: failed with " + e + "\n");
		}
	},

	loadinputs: function(content)
	{
		try {
			var inputs = content.getElementsByTagName("input");

			for (var i = 0; i < inputs.length; ++i) {
				var preftype = inputs[i].getAttribute("wotpref");

				if (!preftype) {
					continue;
				}
				
				var id = inputs[i].getAttribute("id");

				if (!id || this.disallowed[id]) {
					continue;
				}
			
				var type = inputs[i].getAttribute("type");

				if (!type) {
					continue;
				}
				
				var value = null;

				if (preftype == "bool") {
					value = wot_prefs.getBool(id, null);
				} else if (preftype == "int") {
					value = wot_prefs.getInt(id, null);
				} else if (preftype == "string") {
					value = wot_prefs.getChar(id, null);
				} else {
					dump("wot_settings.loadinputs: invalid preftype " +
						preftype + "\n");
					continue;
				}

				if (value == null) {
					continue;
				}

				if ((type == "checkbox" || type == "radio") &&
						preftype == "bool") {
					inputs[i].checked = value;
				} else {
					inputs[i].setAttribute("value", value.toString());
				}
			}
			return true;
		} catch (e) {
			dump("wot_settings.loadinputs: failed with " + e + "\n");
		}
		return false;
	},

	loadsearch: function(content)
	{
		try {
			var search = content.getElementById("wotsearch");

			if (!search) {
				return true;
			}

			var preftype = search.getAttribute("wotpref");

			if (!preftype || preftype != "input") {
				return false;
			}

			var rules = [];

			var j = 0;

			for (var i in wot_search.rules) {
				if (!wot_search.rules[i].display ||
					!wot_search.rules[i].display.length) {
					continue;
				}
				rules[j++] = wot_search.rules[i].display;
			}
			rules.sort();

			for (j = 0; j < rules.length; ++j) {
				for (var i in wot_search.rules) {
					if (wot_search.rules[i].display != rules[j]) {
						continue;
					}
				
					var id = WOT_SEARCH + "." + wot_search.rules[i].rule +
								"." + WOT_SEARCH_ENABLED;

					var input = content.createElement("input");

					if (!input) {
						break;
					}

					input.setAttribute("id", id);
					input.setAttribute("type", "checkbox");
					input.setAttribute("wotpref", "bool");
					input.checked = wot_search.rules[i].enabled;

					var label = content.createElement("label");

					if (!label) {
						break;
					}

					label.setAttribute("for", id);

					var text = content.createTextNode(wot_search.rules[i].display);

					if (!text) {
						break;
					}
				
					var br = content.createElement("br");

					if (!br) {
						break;
					}
				
					label.appendChild(text);
					search.appendChild(input);
					search.appendChild(label);
					search.appendChild(br);
				}
			}
			return true;
		} catch (e) {
			dump("wot_settings.loadsearch: failed with " + e + "\n");
		}
		return false;
	}
		
};

wot_modules.push({ name: "wot_settings", obj: wot_settings });
