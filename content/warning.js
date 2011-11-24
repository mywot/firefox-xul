/*
	warning.js
	Copyright © 2006-2011  WOT Services Oy <info@mywot.com>

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

const WOT_WARNING_CSS =
	"@import \"chrome://wot/skin/include/blocked.css\";"

const WOT_WARNING_HTML =
	"<table id=\"wotcontainer\" cellspacing=\"0\" lang=\"{LANG}\" class=\"{CLASS}\">" +
	"<tr id=\"wotheadline\">" +
		"<td colspan=\"2\"></td>" +
	"</tr>" +
	"<tr id=\"wotcontainertop\">" +
		"<td colspan=\"2\"></td>" +
	"</tr>" +
	"<tr id=\"wotdescription\" class=\"wotcontainermiddle\">" +
		"<td colspan=\"2\">" +
			"<div id=\"wotdescriptiontext\" class=\"wotlimitwidth {DESCCLASS}\">{DESC}</div>" +
		"</td>" +
	"</tr>" +
	"<tr id=\"wottarget\" class=\"wotcontainermiddle\">" +
		"<td colspan=\"2\">" +
			"<div id=\"wotwebsite\" class=\"wotlimitwidth\" title=\"{TITLE}\">{TITLE}</div>" +
		"</td>	" +
	"</tr>" +
	"<tr id=\"wotinfo\" class=\"wotcontainermiddle\">" +
		"<td colspan=\"2\">" +
			"<div id=\"wotinfobutton\">" +
				"<span id=\"wotinfotext\">{INFO}</span>" +
			"</div>" +
		"</td>" +
	"</tr>" +
	"<tr id=\"wotratingtop\" class=\"wotcontainermiddle\">" +
		"<td colspan=\"2\"></td>" +
	"</tr>" +
	"<tr id=\"wotratingareatop\" class=\"wotratingarea\">" +
		"<td colspan=\"2\"></td>" +
	"</tr>" +
	"<tr id=\"wotrating0\" class=\"wotratingarea wotratingrow wotreputation{RATING0}\">" +
		"<td class=\"wotratingcol wotratingcolleft\">" +
			"<span class=\"wotratingname\">{RATINGDESC0}</span>" +
		"</td>" +
		"<td class=\"wotratingcol wotratingcolright\">" +
			"<span id=\"wotratingexpl0\" class=\"wotratingexpl\">{RATINGEXPL0}</span>" +
		"</td>" +
	"</tr>" +
	"<tr id=\"wotrating1\" class=\"wotratingarea wotratingrow wotreputation{RATING1}\">" +
		"<td class=\"wotratingcol wotratingcolleft\">" +
			"<span class=\"wotratingname\">{RATINGDESC1}</span>" +
		"</td>" +
		"<td class=\"wotratingcol wotratingcolright\">" +
			"<span id=\"wotratingexpl1\" class=\"wotratingexpl\">{RATINGEXPL1}</span>" +
		"</td>" +
	"</tr>" +
	"<tr id=\"wotrating2\" class=\"wotratingarea wotratingrow wotreputation{RATING2}\">" +
		"<td class=\"wotratingcol wotratingcolleft\">" +
			"<span class=\"wotratingname\">{RATINGDESC2}</span>" +
		"</td>" +
		"<td class=\"wotratingcol wotratingcolright\">" +
			"<span id=\"wotratingexpl2\" class=\"wotratingexpl\">{RATINGEXPL2}</span>" +
		"</td>" +
	"</tr>" +
	"<tr id=\"wotrating4\" class=\"wotratingarea wotratingrow wotreputation{RATING4}\">" +
		"<td class=\"wotratingcol wotratingcolleft\">" +
			"<span class=\"wotratingname\">{RATINGDESC4}</span>" +
		"</td>" +
		"<td class=\"wotratingcol wotratingcolright\">" +
			"<span id=\"wotratingexpl4\" class=\"wotratingexpl\">{RATINGEXPL4}</span>" +
		"</td>" +
	"</tr>" +
	"<tr id=\"wotratingareabottom\" class=\"wotratingarea\">" +
		"<td colspan=\"2\"></td>" +
	"</tr>" +
	"<tr id=\"wotratingbottom\" class=\"wotcontainermiddle\">" +
		"<td colspan=\"2\"></td>" +
	"</tr>" +
	"<tr id=\"wotbuttonstop\" class=\"wotcontainermiddle\">" +
		"<td colspan=\"2\"></td>" +
	"</tr>" +
	"<tr id=\"wotbuttons\" class=\"wotcontainermiddle\">" +
		"<td id=\"wotbuttonrate\">" +
			"<span id=\"wotratebutton\" class=\"wotbutton\">{RATETEXT}</span>" +
		"</td>" +
		"<td id=\"wotbuttongoto\">" +
			"<span id=\"wotgotobutton\" class=\"wotbutton\">{GOTOTEXT}</span>" +
		"</td>" +
	"</tr>" +
	"<tr id=\"wotcontainerbottom\">" +
		"<td colspan=\"2\"></td>" +
	"</tr>" +
	"<tr id=\"wotlogo\">" +
		"<td colspan=\"2\"></td>" +
	"</tr>" +
	"</table>";

const WOT_WARNING_MINHEIGHT = 600;

var wot_warning =
{
	load_delayed: function()
	{
		try {
			if (this.warned) {
				return;
			}

			/* Static strings */
			var replaces = [
				[
					"LANG",
					 wot_util.getstring("language")
				], [
					"INFO",
					 wot_util.getstring("warning_info")
				], [
					"RATINGDESC0",
					wot_util.getstring("rating_0")
				], [
					"RATINGDESC1",
					wot_util.getstring("rating_1")
				], [
					"RATINGDESC2",
					wot_util.getstring("rating_2")
				], [
					"RATINGDESC4",
					wot_util.getstring("rating_4")
				], [
					"RATETEXT",
					wot_util.getstring("warning_rate")
				], [
					"GOTOTEXT",
					wot_util.getstring("warning_goto")
				]
			];
			
			this.container = this.processhtml(WOT_WARNING_HTML, replaces);
			this.warned = {};
		} catch (e) {
			dump("wot_warning.load: failed with " + e + "\n");
		}
	},

	processhtml: function(html, replaces)
	{
		try {
			for (var i = 0; i < replaces.length; ++i) {
				html = html.replace(
							RegExp("{" + replaces[i][0] + "}", "g"),
							replaces[i][1]);
			}

			return html;
		} catch (e) {
			dump("wot_warning.processhtml: failed with " + e + "\n");
		}

		return null;
	},

	isblocking: function()
	{
		var blocking = false;
		try {
			for (var i = 0; i < WOT_APPLICATIONS; ++i) {
				if (wot_prefs["warning_type_" + i] == WOT_WARNING_BLOCK) {
					blocking = true;
					break;
				}
			}
		} catch (e) {
			dump("wot_warning.isblocking: failed with " + e + "\n");
		}
		return blocking;
	},

	getwarningtype: function(hostname, i, reason)
	{
		try {
			if (!wot_prefs["show_application_" + i]) {
				return WOT_WARNING_NONE;
			}

			var type = wot_prefs["warning_type_" + i];

			if (type == WOT_WARNING_NONE) {
				return WOT_WARNING_NONE;
			}

			var confidence = wot_prefs.min_confidence_level;
			var level = wot_prefs["warning_level_" + i];
			var r = wot_cache.get(hostname, "reputation_" + i);
			var c = wot_cache.get(hostname, "confidence_" + i);
			var x = wot_cache.get(hostname, "excluded_" + i);
			var t = -1;

			if (wot_cache.get(hostname, "status") == WOT_QUERY_OK) {
				t = wot_cache.get(hostname, "testimony_" + i);
			}

			var unknown = wot_prefs["warning_unknown_" + i];

			var rr = x ? 0 : r;
			var cc = x ? level : c;

			if (((rr >= 0 && r <= level && (cc >= confidence || unknown)) ||
					(rr < 0 && unknown)) &&
				  (t < 0 || t <= level)) {
				if (r < 0) {
					return (reason) ? WOT_REASON_UNKNOWN : type;
				} else {
					return (reason) ? WOT_REASON_RATING : type;
				}
			} else if (t >= 0 && t <= level) {
				return (reason) ? WOT_REASON_TESTIMONY : type;
			}
		} catch (e) {
			dump("wot_warning.getwarningtype: failed with " + e + "\n");
		}

		return WOT_WARNING_NONE;
	},

	isdangerous: function(hostname, increase)
	{
		var result = WOT_WARNING_NONE;
		try {
			if (!wot_cache.isok(hostname)) {
				return result;
			}

			for (var i = 0; i < WOT_APPLICATIONS; ++i) {
				var type = wot_warning.getwarningtype(hostname, i, false);

				if (type > result) {
					result = type;
				}

				if (result == WOT_WARNING_BLOCK) {
					break;
				}
			}

			if (result == WOT_WARNING_NOTIFICATION ||
					result == WOT_WARNING_DOM) {
				var warned = wot_cache.get(hostname, "warned");

				if (warned >= WOT_MAX_WARNINGS) {
					result = WOT_WARNING_NONE;
				} else if (increase) {
					wot_cache.set(hostname, "warned", warned + 1);
				}
			}
		} catch (e) {
			dump("wot_warning.isdangerous: failed with " + e + "\n");
		}
		return result;
	},

	dontwarn: function(url)
	{
		try {
			var hostname = wot_url.gethostname(url);

			if (!hostname || !wot_cache.isok(hostname)) {
				return;
			}

			var testified = false;

			for (var i = 0; i < WOT_APPLICATIONS; ++i) {
				var type = wot_warning.getwarningtype(hostname, i, false);

				if (type != WOT_WARNING_NONE) {
					wot_cache.set(hostname, "testimony_" + i,
						(WOT_MIN_REPUTATION_4 + WOT_MIN_REPUTATION_5) / 2);
					wot_cache.set(hostname, "pending", true);
					wot_core.pending[hostname] = true;
					testified = true;
				}
			}

			if (testified) {
				wot_core.update();
			}
		} catch (e) {
			dump("wot_warning.dontwarn: failed with " + e + "\n");
		}
	},

	domcontentloaded: function(event)
	{
		try {
			if (!event || !wot_util.isenabled()) {
				return;
			}

			var content = event.originalTarget;

			if (!content || !content.location || !content.location.href ||
					wot_url.isprivate(content.location.href)) {
				return;
			}

			var hostname = wot_url.gethostname(content.location.href);

			if (wot_warning.isdangerous(hostname, false) == WOT_WARNING_DOM) {
				wot_warning.add(hostname, content, WOT_WARNING_DOM);
			}
		} catch (e) {
			dump("wot_warning.domcontentloaded: failed with " + e + "\n");
		}
	},

	getheight: function(content)
	{
		try {
			if (content.defaultView && content.defaultView.innerHeight) {
				return content.defaultView.innerHeight;
			}

			if (content.clientHeight) {
				return content.clientHeight;
			}

			if (content.body && content.body.clientHeight) {
				return content.body.clientHeight;
			}
		} catch (e) {
			dump("wot_warning.getheight: failed with " + e + "\n");
		}
		return -1;
	},

	add: function(hostname, content, type)
	{
		/* Obviously, this isn't exactly foolproof. A site might have
			elements with a higher z-index, or it might try to remove
			our layer. That's why we show the notification bar too.

			A better, but more complicated solution would be to create
			a canvas over the browser and draw a copy of the contents
			there. We'll go there if it comes to that. */

		try {
			if (!hostname || !content ||
					content.getElementById("wotwarning")) {
				return false;
			}

			var replaces = [
				[
					"TITLE",
					(wot_shared.decodehostname(hostname) || "")
						.replace(/[<>&="']/g, "")
				]
			];

			var reason = WOT_WARNING_NONE;
			var accessible = wot_prefs.accessible ? " wotaccessible" : "";

			for (var i = 0; i < WOT_APPLICATIONS; ++i) {
				var t = this.getwarningtype(hostname, i, true);
				var r = wot_cache.get(hostname, "reputation_" + i);
				var x = wot_cache.get(hostname, "excluded_" + i);

				if (reason < t) {
					reason = t;
				}

				if (r >= WOT_MIN_REPUTATION_5) {
					replaces.push([ "RATING" + i, 5 + accessible ]);
					replaces.push([ "RATINGEXPL" + i,
									wot_util.getstring("help_5") ]);
				} else if (r >= WOT_MIN_REPUTATION_4) {
					replaces.push([ "RATING" + i, 4 + accessible ]);
					replaces.push([ "RATINGEXPL" + i,
									wot_util.getstring("help_4")]);
				} else if (r >= WOT_MIN_REPUTATION_3) {
					replaces.push([ "RATING" + i, 3 + accessible ]);
					replaces.push([ "RATINGEXPL" + i,
									wot_util.getstring("help_3") ]);
				} else if (r >= WOT_MIN_REPUTATION_2) {
					replaces.push([ "RATING" + i, 2 + accessible ]);
					replaces.push([ "RATINGEXPL" + i,
									wot_util.getstring("help_2") ]);
				} else if (r >= 0) {
					replaces.push([ "RATING" + i, 1 + accessible ]);
					replaces.push([ "RATINGEXPL" + i,
									wot_util.getstring("help_1") ]);
				} else if (x) {
					replaces.push([ "RATING" + i, "x" + accessible ]);
					replaces.push([ "RATINGEXPL" + i, "&nbsp;" ]);
				} else {
					replaces.push([ "RATING" + i, 0 + accessible ]);
					replaces.push([ "RATINGEXPL" + i, "&nbsp;" ]);
				}
			}

			var notification;
			var warnclass = "";

			if (this.getheight(content) < WOT_WARNING_MINHEIGHT) {
				warnclass = "wotnoratings";
			}

			if (reason == WOT_REASON_UNKNOWN) {
				warnclass += " wotunknown";
			}

			if (reason == WOT_REASON_RATING) {
				notification = wot_util.getstring("warning_message_normal");
				replaces.push([ "CLASS", warnclass ]);
				replaces.push([ "DESCCLASS", "wotlongdescription" ]);
				replaces.push([ "DESC",
					wot_util.getstring("warning_desc_normal") ]);
			} else if (reason == WOT_REASON_TESTIMONY) {
				notification = wot_util.getstring("warning_message_userrated");
				replaces.push([ "CLASS", "wotnoratings" ]);
				replaces.push([ "DESCCLASS", "wotlongdescription" ]);
				replaces.push([ "DESC",
					wot_util.getstring("warning_desc_userrated") ]);
			} else {
				notification = wot_util.getstring("warning_message_unknown");
				replaces.push([ "CLASS", warnclass ]);
				replaces.push([ "DESCCLASS", "" ]);
				replaces.push([ "DESC",
					wot_util.getstring("warning_desc_unknown") ]);
			}

			/* Show the notification bar always */
			if (reason != WOT_REASON_UNKNOWN) {
				window.setTimeout(wot_browser.show_warning,
					WOT_DELAY_WARNING, hostname, notification);
			}

			if (type != WOT_WARNING_DOM || this.warned[hostname]) {
				return true;
			}

			if (!content.contentType ||
					content.contentType.toLowerCase().indexOf("html") < 0) {
				return true;
			}

			var head = content.getElementsByTagName("head");
			var body = content.getElementsByTagName("body");

			if (!head || !head.length ||
				!body || !body.length) {
				return true;
			}
			
			var style = content.createElement("style");

			if (!style) {
				return false;
			}

			style.setAttribute("type", "text/css");
			style.innerHTML = WOT_WARNING_CSS;

			head[0].appendChild(style);

			var warning = content.createElement("div");
			var wrapper = content.createElement("div");

			if (!warning || !wrapper) {
				return false;
			}

			warning.setAttribute("id", "wotwarning");

			if (wot_prefs.warning_opacity &&
					wot_prefs.warning_opacity.length > 0 &&
					Number(wot_prefs.warning_opacity) >= 0 &&
					Number(wot_prefs.warning_opacity) <= 1) {
				warning.setAttribute("style", "opacity: " +
					wot_prefs.warning_opacity + " ! important;");
			}

			wrapper.setAttribute("id", "wotwrapper");
			wrapper.innerHTML = this.processhtml(this.container, replaces);

			body[0].appendChild(warning);
			body[0].appendChild(wrapper);

			/* Flash has authority issues with z-index, so try to hide it
				while warning is being shown. */
			this.hideobjects(content, true);
			return true;
		} catch (e) {
			dump("wot_warning.add: failed with " + e + "\n");
		}

		return false;
	},

	hide: function(content)
	{
		try {
			wot_browser.hide_warning();

			if (content) {
				var elems = [ content.getElementById("wotwarning"),
							  content.getElementById("wotwrapper") ];

				for (var i = 0; i < elems.length; ++i) {
					if (elems[i] && elems[i].parentNode) {
						elems[i].parentNode.removeChild(elems[i]);
					}
				}
			}
		} catch (e) {
			dump("wot_warning.hide: failed with " + e + "\n");
		}
	},

	hideobjects: function(content, hide)
	{
		try {
			if (content.defaultView && content.defaultView.frames) {
				var frames = content.defaultView.frames;
				for (var j = 0; j < frames.length; ++j) {
					if (frames[j].document) {
						this.hideobjects(frames[j].document, hide);
					}
				}
			}

			var elems = [ "embed", "object", "iframe", "applet" ];

			for (var i = 0; i < elems.length; ++i) {
				var objs = content.getElementsByTagName(elems[i]);

				for (var j = 0; objs && j < objs.length; ++j) {
					if (hide) {
						objs[j].setAttribute("wothidden",
							objs[j].style.display || "block");
						objs[j].style.display = "none";
					} else {
						var display = objs[j].getAttribute("wothidden");
						if (display) {
							objs[j].removeAttribute("wothidden");
							objs[j].style.display = display;
						}
					}
				}
			}
		} catch (e) {
			dump("wot_warning.hideobjects: failed with " + e + "\n");
		}
	},

	click: function(event)
	{
		try {
			if (!event || !event.view) {
				return;
			}

			var content = event.view.document;

			if (!content) {
				return;
			}

			var warning = content.getElementById("wotwarning");

			if (!warning || warning.style.display == "none") {
				return;
			}
			
			var wrapper = content.getElementById("wotwrapper");

			if (!wrapper) {
				return;
			}

			var node = event.originalTarget;

			while (node) {
				if (node.id &&
						(node.id == "wotratebutton" ||
						 node.id == "wotgotobutton" ||
						 node.id == "wotinfobutton")) {
					break;
				}
				node = node.parentNode;
			}

			if (!node || !node.id) {
				return;
			}

			if (node.id == "wotgotobutton") {
				wot_warning.warned[wot_core.hostname] = true;
				warning.style.display = "none";
				wrapper.style.display = "none";
				wot_warning.hideobjects(content, false);
			} else if (node.id == "wotinfobutton") {
				wot_browser.openscorecard(wot_core.hostname, null, "warning");
			} else if (node.id == "wotratebutton") {
				wot_browser.openscorecard(wot_core.hostname, WOT_SCORECARD_RATE,
					"warning");
			}
		} catch (e) {
			dump("wot_warning.click: failed with " + e + "\n");
		}
	}
};

wot_modules.push({ name: "wot_warning", obj: wot_warning });
