/*
	warning.js
	Copyright © 2006 - 2012  WOT Services Oy <info@mywot.com>

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

const WOT_WARNING_CSS = "@import \"chrome://wot/skin/include/blocked.css\";";

var wot_warning =
{
	minheight: 600,
	exit_mode: "back",
	is_blocked: false,

	make_warning: function()
	{
		var wot_warning = "<div id='wotcontainer' class='wotcontainer {CLASS} {ACCESSIBLE}'>" +
			"<div class='wot-logo'></div>" +
			"<div class='wot-warning'>{WARNING}</div>" +
			"<div class='wot-title'>{TITLE}</div>" +
			"<div class='wot-desc'>{DESC}</div>" +
			"<div class='wot-openscorecard-wrap'>" +
			"<span id='wotinfobutton' class='wot-openscorecard wot-link'>{INFO}</span>" +
			"</div>" +
			"<div id='wot-ws-ratings'>";

		for(var c=0; c < WOT_APPLICATIONS; c++) {

			if(!wot_prefs["show_application_" + c]) continue;

			var S_COMPNAME = "RATINGDESC" + c,
				S_RATING = "RATING" + c,
				S_RATING_EXPL = "RATINGEXPL" + c;

			wot_warning += "" +
				"<div class='wot-component'>" +
				"<div class='wot-comp-name'>{" + S_COMPNAME + "}</div>" +
				"<div class='wot-comp-level' r='{" + S_RATING + "}'>{" + S_RATING_EXPL + "}</div>" +
				"<div class='wot-comp-icon' r='{" + S_RATING + "}'></div>" +
				"</div>";
		}

		wot_warning +=
			"</div>" +
				"<div class='wot-rateit-wrap'>" +
				"<span>{RATETEXT}</span>" +
				"</div>" +
				"<div class='wot-buttons'>";

		if(!this.is_blocked) {
			// don't show "Goto the site" button in "Blocked" mode
			wot_warning += "<div id='wot-btn-hide' class='wot-button'>{GOTOSITE}</div>";
		}

		wot_warning += "<div id='wot-btn-leave' class='wot-button'>{LEAVESITE}</div>" +
			"</div>" +
			"</div>";

		return wot_warning;
	},

	load_delayed: function(blocked)
	{
		this.is_blocked = !!blocked || false;
		try {
			if (this.warned && !this.is_blocked) {
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
					"GOTOSITE",
					wot_util.getstring("warning_goto")
				], [
					"WARNING",
					this.is_blocked ? wot_util.getstring("warning_blocked") : wot_util.getstring("warning_warning")

				]
			];
			
			this.container = this.processhtml(this.make_warning(), replaces);
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
		// decides whether we must block page or just warn
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

	getwarningtype: function(hostname, app, reason)
	{
		try {
			if (!wot_prefs["show_application_" + app]) {
				return WOT_WARNING_NONE;
			}

			var type = wot_prefs["warning_type_" + app];

			if (type == WOT_WARNING_NONE) {
				return WOT_WARNING_NONE;
			}

			var min_confidence = wot_prefs.min_confidence_level;
			var level = wot_prefs["warning_level_" + app];
			var r = wot_cache.get(hostname, "reputation_" + app);
			var c = wot_cache.get(hostname, "confidence_" + app);
			var x = wot_cache.get(hostname, "excluded_" + app);
			var t = -1;

			if (wot_cache.get(hostname, "status") == WOT_QUERY_OK) {
				t = wot_cache.get(hostname, "testimony_" + app);
			}

			var unknown = wot_prefs["warning_unknown_" + app];

			var rr = x ? 0 : r;
			var cc = x ? level : c;

			if (((rr >= 0 && r <= level && (cc >= min_confidence || unknown)) ||
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

	set_exitmode: function(content)
	{
		var window = content.defaultView;
		var steps_back = this.is_blocked ? 2 : 1; // when mode is Blocking, there are at least 2 steps in history
		if(window.history.length > steps_back) {
			wot_warning.exit_mode = "back"; // note: don't change this string, there are code dependent on it
		} else {
			wot_warning.exit_mode = "leave";
		}
		return wot_warning.exit_mode;
	},

	add: function(hostname, content, type, forced_reason)
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

			// If is set, no need to decide what kind of warning to show.
			forced_reason = forced_reason || false;   // used when func is called from blocked.js.

			if(!forced_reason) wot_warning.set_exitmode(content); // call it only in usual mode

			var rate_site = wot_util.getstring("warning_rate").replace("<a>", "<a id='wotrate-link' class='wot-link'>");
			var replaces = [
				[
					"TITLE",
					(wot_shared.decodehostname(hostname) || "")
						.replace(/[<>&="']/g, "")
				],
				[
					"LEAVESITE",
					wot_util.getstring("warning_" + wot_warning.exit_mode)
				],
				[
					"RATETEXT", rate_site
				]
			];

			var reason = WOT_WARNING_NONE;
			var accessible = wot_prefs.accessible ? " accessible" : "";

			replaces.push([ "ACCESSIBLE", accessible ]);

			for (var i = 0; i < WOT_APPLICATIONS; ++i) {
				// don't call getwarningtype() if forced_reason is provided
				var t = forced_reason ? WOT_WARNING_NONE : this.getwarningtype(hostname, i, true);

				var r = wot_cache.get(hostname, "reputation_" + i);
				var x = wot_cache.get(hostname, "excluded_" + i);

				if (forced_reason) {
					reason = forced_reason;
				} else {
					reason = (reason < t) ? t : reason;
				}


				var r_level = wot_core.get_level(r);

				if (r_level >= 0) {
					replaces.push([ "RATING" + i, "r" + r_level ]);
					replaces.push([ "RATINGEXPL" + i, wot_util.getstring("help_" + r_level) ]);
				} else if (x) {
					replaces.push([ "RATING" + i, "rx" ]);
					replaces.push([ "RATINGEXPL" + i, "&nbsp;" ]);
				}
			}

			var notification;
			var warnclass = "";

			if (this.getheight(content) < this.minheight) {
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
					WOT_DELAY_WARNING, hostname, notification, true);
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
				while warning is being shown (skip on "blocked!" page) */
			if (forced_reason === false) this.hideobjects(content, true);
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
			var i,j;
			var win = content.defaultView;

			if (win && win.frames) {
				var frames = win.frames;
				for (j = 0; j < frames.length; ++j) {
					if (frames[j].document) {
						this.hideobjects(frames[j].document, hide);
					}
				}
			}

			var elems = [ "embed", "object", "iframe", "applet" ];

			for (i = 0; i < elems.length; ++i) {
				var objs = content.getElementsByTagName(elems[i]);

				for (j = 0; objs && j < objs.length; ++j) {
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

			var wot_blocked = content.getElementById("wotblocked"); // Important to have element with this ID
			var is_blocked = !!wot_blocked;
			if(is_blocked) {
				this.exit_mode = wot_blocked.getAttribute("exit_mode"); // take exit_mode from DOM, since this is module
			}

			var node = event.originalTarget;
			var handle_ids = {
				"wotrate-link":  true,
				"wot-btn-hide":  true,
				"wot-btn-leave": true,
				"wotinfobutton": true
			};

			var node_id = null;

			while (node) {
				node_id = node.id;
				if (node_id && handle_ids[node_id]) break;
				node = node.parentNode;
			}

			if (!node || !node_id) {
				return;
			}

			switch (node_id) {
				case "wot-btn-hide":
					wot_warning.warned[wot_core.hostname] = true;
					warning.style.display = "none";
					wrapper.style.display = "none";
					wot_warning.hideobjects(content, false);
					break;

				case "wotinfobutton":
					wot_browser.openscorecard(wot_core.hostname, null, WOT_URL_WARNVIEWSC);
					break;

				case "wotrate-link":
					wot_browser.openscorecard(wot_core.hostname, WOT_SCORECARD_RATE, WOT_URL_WARNRATE);
					break;

				case "wot-btn-leave":
					var window = content.defaultView;
					if(wot_warning.exit_mode == "leave") {
						// close tab
						window.close();
					} else {
						var e_beforeunload = window.onbeforeunload;
						var back_timer = null;
						window.onbeforeunload = function() {
							if(back_timer) {
								window.clearTimeout(back_timer);
							}
							if(e_beforeunload) e_beforeunload(window);
						};

						var steps_back = is_blocked ? -2 : -1;
						var prev_location = window.location.href;
						window.history.go(steps_back);

						back_timer = window.setTimeout(function() {
							// this is a trick: we don't know if there is a back-step possible if history.length>1,
							// so we simply wait for a short time, and if we are still on a page, then "back" is impossible and
							// we should go to blank page
							if(window.location.href == prev_location) window.close();
						}, 500);
					}

					break;
			}

		} catch (e) {
			dump("wot_warning.click: failed with " + e + "\n");
		}
	}
};

wot_modules.push({ name: "wot_warning", obj: wot_warning });
