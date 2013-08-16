/*
	commands.js
	Copyright © 2005-2011  WOT Services Oy <info@mywot.com>

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

var wot_commands =
{
	load_delayed: function()
	{
		try {
			this.menu = document.getElementById("contentAreaContextMenu");

			if (this.menu) {
				this.menu.addEventListener("popupshowing",
					wot_commands.contextmenushowing, false);
			}
		} catch (e) {
			dump("wot_commands.load: failed with " + e + "\n");
		}
	},

	unload: function()
	{
		try {
			if (this.menu) {
				this.menu.removeEventListener("popupshowing",
					wot_commands.contextmenushowing, false);
				this.menu = null;
			}
		} catch (e) {
			dump("wot_commands.unload: failed with " + e + "\n");
		}
	},

	getcontexthostname: function()
	{
		try {
			if (gContextMenu.onLink && gContextMenu.linkURL) {
				return wot_url.gethostname(gContextMenu.linkURL);
			}
		} catch (e) {
			dump("wot_commands.getcontexthostname:: failed with " + e + "\n");
		}

		return null;
	},

	contextmenushowing: function()
	{
		try {
			var hostname = wot_commands.getcontexthostname();
			var r = -1;

			if (hostname) {
				r = wot_search.getreputation(hostname);
			}

			var item = document.getElementById("wot-content-openlinkscorecard");

			if (item) {
				if (r < 0) {
					item.setAttribute("image", "");
				} else {
					item.setAttribute("image", wot_ui.geticonurl(r, 16, true));
				}
			}

			gContextMenu.showItem("wot-content-openlinkscorecard",
				!!hostname);
		} catch (e) {
			dump("wot_commands.contextmenushowing: failed with " + e + "\n");
		}
	},

	/* Determines the elements for which a tooltip should be shown */
	tooltip_update: function(element)
	{
		try {
			return (element == document.getElementById("wot-button") ||
					element == document.getElementById("wot-bar") ||
					element == document.getElementById("wot-bar-image"));
		} catch (e) {
			dump("wot_commands.tooltip_update: failed with " + e + "\n");
		}
		return false;
	},

	update: function(what)
	{
		try {
			if (!what) {
				what = "command";
			}

			/* Enabled? */
			document.getElementById("wot-" + what + "-enabled").
				setAttribute("checked", wot_prefs.enabled);

			var cached = wot_cache.isok(wot_core.hostname);

			/* Refresh */
			document.getElementById("wot-" + what + "-refresh").
				setAttribute("disabled", !wot_util.isenabled() || !cached);

		} catch (e) {
			dump("wot_commands.update: failed with " + e + "\n");
		}
	},

	enabled: function()
	{
		try {
			wot_prefs.enabled = !wot_prefs.enabled;
			wot_prefs.setBool("enabled", wot_prefs.enabled);
			wot_core.update();
		} catch (e) {
			wdump("wot_commands.enabled: failed with " + e);
		}
	},

	refresh: function()
	{
		try {
			if (wot_cache.iscached(wot_core.hostname)) {
				wot_cache.set(wot_core.hostname, "status", WOT_QUERY_RETRY);
				wot_core.update();
			}
		} catch (e) {
			wdump("wot_commands.refresh: failed with " + e);
		}
	},

	preferences: function()
	{
		try {
			getBrowser().loadURI(wot_url.getprefurl());
		} catch (e) {
			dump("wot_commands.preferences: failed with " + e + "\n");
		}
	},

	checkupdates: function()
	{
		try {
			wot_api_update.send(true);
		} catch (e) {
			dump("wot_commands.checkupdates: failed with " + e + "\n");
		}
	},

	my: function()
	{
		try {
			var url = wot_url.getwoturl("", WOT_URL_MENUMY);
			if (url) {
				getBrowser().loadURI(url);
			}
		} catch (e) {
			dump("wot_commands.my: failed with " + e + "\n");
		}
	},

//	quicktestify: function(value)
//	{
//		try {
//			if (wot_cache.isok(wot_core.hostname)) {
//                wot_cache.set(wot_core.hostname, "testimony_0",
//                    Number(value));
//                wot_cache.set(wot_core.hostname, "pending", true);
//                wot_core.pending[wot_core.hostname] = true;
//                wot_core.update();
//            }
//		} catch (e) {
//			dump("wot_commands.quicktestify: failed with " + e + "\n");
//		}
//	},

	open_scorecard_link: function()
	{
        // Opens scorecard in a new tab for the URL selected via context menu
		try {
			wot_browser.openscorecard(wot_commands.getcontexthostname(), null, WOT_URL_CTX);
		} catch (e) {
		}
	}
};

wot_modules.push({ name: "wot_commands", obj: wot_commands });

var wot_events =
{
//	testimonydown: -1,

//	get_slider_pos: function(event, testimony)
//	{
//		var pos = -1;
//		try {
//			var slider = document.getElementById("wot-rating-" +
//				testimony + "-slider");
//			var sld_rule = wot_css.getstyle(WOT_STYLESHEET,
//				".wot-rating-slider");
//
//			if (!slider || !sld_rule) {
//				return pos;
//			}
//
//			/* Calculate testimony value */
//			var sld_w = wot_css.getstyle_numeric(sld_rule, "width");
//
//			pos = WOT_MAX_REPUTATION * (event.screenX -
//						slider.boxObject.screenX) / sld_w;
//
//			/* Limit to a valid range */
//			if (pos > WOT_MAX_REPUTATION) {
//				pos = WOT_MAX_REPUTATION;
//			} else if (pos < 0) {
//				pos = 0;
//			}
//
//			/* Round */
//			pos = (pos / WOT_TESTIMONY_ROUND).toFixed() * WOT_TESTIMONY_ROUND;
//		} catch (e) {
//			dump("wot_events.get_slider_pos: failed with " + e + "\n");
//			pos = -1;
//		}
//		return pos;
//	},

//	/* Handles testimony slider events and updates the new pending testimony to
//	   query cache */
//	slider_down: function(event, testimony)
//	{
//		try {
//			if (!wot_cache.isok(wot_core.hostname)) {
//				return false;
//			}
//
//			this.testimonydown = testimony;
//
//			var pos = this.get_slider_pos(event, testimony);
//			if (pos < 0) {
//				return false;
//			}
//
//			/* Insert into cache */
//			if (wot_cache.get(wot_core.hostname, "testimony_" +
//					testimony) != pos) {
//				wot_cache.set(wot_core.hostname, "testimony_" +
//					testimony, Number(pos));
//				wot_cache.set(wot_core.hostname, "pending", true);
//				wot_core.pending[wot_core.hostname] = true;
//
////				/* Update testimony window */
////				wot_ui.update_testimonies();
//			}
//
//			/* Any pending testimonies will be stored in wot_core.update,
//				which is called when the popup window is closed */
//			return true;
//		} catch (e) {
//			dump("wot_events.slider: failed with " + e + "\n");
//		}
//		return false;
//	},

//	slider_up: function(event, testimony)
//	{
//		this.testimonydown = -1;
//		return true;
//	},

//	slider_move: function(event, testimony)
//	{
//		/* Apparently, there is no way to detect if the mouse button is
//			down besides counting clicks. This means that if the mouse
//			button is released while outside the window, we won't be able
//			to detect it and the slider keeps moving... */
//		if (this.testimonydown == testimony) {
//			this.slider_down(event, testimony);
//		} else {
//			this.testimonydown = -1;
//			if (wot_cache.isok(wot_core.hostname)) {
//				var pos = this.get_slider_pos(event, testimony);
//				if (pos >= 0) {
//					wot_ui.update_testimonies(testimony, pos);
//				}
//			}
//		}
//		return true;
//	},

	click_button: function(event)
	{
		try {
			/* Middle-click takes to scorecard */
			if (event.button == 1 && wot_core.hostname) {
				wot_browser.openscorecard(wot_core.hostname, null, WOT_URL_BTN);
			}
		} catch (e) {
			dump("wot_events.click_button: failed with " + e + "\n");
		}
	},

	/* Hides the popup window */
	popup_hide: function()
	{
		try {
			var popup = document.getElementById("wot-popup");
			if (popup) {
				popup.hidePopup();
			}
		} catch (e) {
			dump("wot_events.popup_hide: failed with " + e + "\n");
		}
		return false;
	},

	click_title: function(event) {
		try {
			if (!wot_prefs.enabled) {
				wot_commands.enabled();
			}
		} catch (e) {
			dump("wot_events.click_title: failed with " + e + "\n");
		}
	},

	click_help: function(event, i) {
		try {
			var link = document.getElementById("wot-rating-" + i + "-help-link");
			if (link && link.getAttribute("comment") == "true") {
				return this.click_scorecard(event, true);
			}
		} catch (e) {
			dump("wot_events.click_help: failed with " + e + "\n");
		}
		return false;
	},

	click_user: function(event, i)
	{
		try {
			var content = document.getElementById("wot-user-" + i + "-content");

			if (!content) {
				return false;
			}

			var browser = getBrowser();
			if (browser) {
				browser.selectedTab =
					browser.addTab(content.getAttribute("url"));
				this.popup_hide();
			}
		} catch (e) {
			dump("wot_events.click_user: failed with " + e + "\n");
		}
		return false;
	},

	click_scorecard: function(event, comment)
	{
		try {
			var action = null;

			if (comment) {
				action = WOT_SCORECARD_COMMENT;
			}

			if (wot_core.hostname &&
					wot_browser.openscorecard(wot_core.hostname,
						action, WOT_URL_RWVIEWSC)) {
				this.popup_hide();
			}
		} catch (e) {
			dump("wot_events.click_scorecard: failed with " + e + "\n");
		}
		return false;
	},

	click_logo: function(event)
	{
		try {
			var browser = getBrowser();
			var url = wot_url.getwoturl("", WOT_URL_RWLOGO);

			if (browser && url) {
				browser.selectedTab = browser.addTab(url);
				this.popup_hide();
			}
		} catch (e) {
			dump("wot_events.click_guide: failed with " + e + "\n");
		}
		return false;
	},

	click_guide: function(event)
	{
		try {
			var browser = getBrowser();
			if (browser) {
				var url = wot_url.getprefurl("guide", false, null, WOT_URL_RWGUIDE); // getprefurl() already considers context
				browser.selectedTab =
					browser.addTab(url);
				this.popup_hide();
			}
		} catch (e) {
			dump("wot_events.click_guide: failed with " + e + "\n");
		}
		return false;
	},

	click_prefs: function(event)
	{
		try {
			var browser = getBrowser();
			if (browser) {
				browser.selectedTab = browser.addTab(wot_url.getprefurl(null, null, null, WOT_URL_RWSETTINGS));
				this.popup_hide();
			}
		} catch (e) {
			dump("wot_events.click_prefs: failed with " + e + "\n");
		}
		return false;
	},

	click_message: function(event)
	{
		try {
			if (/^\w+:\/\/.+/.test(wot_api_query.message_url)) {
				var browser = getBrowser();
				if (browser) {
					browser.selectedTab =
						browser.addTab(wot_api_query.message_url);
					this.popup_hide();
				}
			}
		} catch (e) {
			dump("wot_events.click_message: failed with " + e + "\n");
		}
		return false;
	}
};
