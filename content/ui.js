/*
	ui.js
	Copyright © 2005 - 2012  WOT Services Oy <info@mywot.com>

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

var wot_status = {
	set: function(status, description)
	{
		try {
			if (wot_api_query.message.length > 0 &&
				wot_api_query.message_type.length > 0 &&
				wot_api_query.message_id != wot_prefs.last_message &&
				wot_api_query.message_id != WOT_SERVICE_XML_QUERY_MSG_ID_MAINT) {
				status += "-update";
			}

			/* Set tooltip and status */
			var mainwnd = document.getElementById("main-window");
			if (mainwnd) {
				mainwnd.setAttribute("wot-status", status);
			}

			var tooltip = document.getElementById("wot-tooltip-text");
			if (tooltip) {
				tooltip.value = description;
			}

			/* Update display */
			if (wot_prefs.updateui) {
				wot_ui.update(description);
			}
		} catch (e) {
			dump("wot_status.set: failed with " + e + "\n");
		}
	},

	update: function()
	{
		try {
			if (!wot_util.isenabled()) {
				return;
			}

			var reputation = -1;

			if (wot_cache.isok(wot_core.hostname)) {
				reputation = wot_cache.get(wot_core.hostname, "reputation_0");
			}
			
			if (reputation > WOT_MAX_REPUTATION) {
				reputation = WOT_MAX_REPUTATION;
			}

			var excluded = wot_cache.get(wot_core.hostname, "excluded_0");

			/* Set status and description */
			var status, description, testimonies = false;

			for (var i = 0; i < WOT_APPLICATIONS; ++i) {
				if (wot_cache.get(wot_core.hostname, "testimony_" + i) >= 0) {
					testimonies = true;
					break;
				}
			}

			if (excluded) {
				status = "excluded";
				description = "";
			} else {
                status = wot_util.get_level(WOT_REPUTATIONLEVELS, reputation).level;
				description = wot_util.getstring("description_rating_" + status);
			}

			if (testimonies) {
				status += "-testimony";
			}

			this.set(status, description);

			var type = wot_warning.isdangerous(wot_core.hostname, true);
			var content = getBrowser().selectedBrowser.contentDocument;

			if (type == WOT_WARNING_NOTIFICATION || type == WOT_WARNING_DOM) {
				wot_warning.add(wot_core.hostname, content, type);
			} else {
				if(type != WOT_WARNING_BLOCK) wot_warning.hide(content);
			}
		} catch (e) {
			wdump("wot_status.update: failed with " + e);
		}
	}
};

var wot_ui = {

    SLIDER_WIDTH: 194,  // make sure there is same value as in wot.css for .wot-rating-slider selector.

    getElem: function (id) {
        // just a shortcut
        return document.getElementById(id);
    },

    show_accessible: function()
	{
		try {
			var mainwnd = this.getElem("main-window");
			if (mainwnd) {
				var mode = "normal";

				if (wot_prefs.accessible) {
					mode = "accessible";
				}

				if (mainwnd.getAttribute("wot-mode") != mode) {
					mainwnd.setAttribute("wot-mode", mode);
					wot_my_session.update(false); /* Update cookies */
				}
			}
		} catch (e) {
			wdump("wot_ui.show_accessible: failed with " + e);
		}
	},

//	show_partner: function()
//	{
//		try {
//			var mainwnd = this.getElem("main-window");
//			if (mainwnd) {
//				var partner = wot_partner.getpartner() || "";
//
//				if (mainwnd.getAttribute("wot-partner") != partner) {
//					mainwnd.setAttribute("wot-partner", partner);
//				}
//
////				this.getElem("wot-partner").hidden = !partner.length;
//			}
//		} catch (e) {
//			wdump("wot_ui.show_partner: failed with " + e);
//		}
//	},

	show_toolbar_button: function(id, after) {
		try {
			var nbr = this.getElem("nav-bar");

			if (!nbr || nbr.currentSet.indexOf(id) != -1) {
				return;
			}

			var box = this.getElem("navigator-toolbox");

			if (!box) {
				return;
			}

			var bar = box.firstChild;

			while (bar) {
				if (bar.currentSet && bar.currentSet.indexOf(id) != -1) {
					return;
				}
				bar = bar.nextSibling;
			}

			var target = this.getElem(after);

			if (target) {
				target = target.nextSibling;
			}
		
			nbr.insertItem(id, target);
			nbr.setAttribute("currentset", nbr.currentSet);
			document.persist("nav-bar", "currentset");
		} catch (e) {
			wdump("wot_ui.show_toolbar_button: failed with " + e);
		}
	},

	/* Shows or hides user interface elements based on preferences */
	show_elements: function()
	{
		try {
			/* Toolbar */
			if (!wot_prefs.button_created || wot_prefs.create_button) {
				wot_prefs.setBool("button_created", true);
				this.show_toolbar_button("wot-button", "stop-button");
			}

			/* Accessibility */
			this.show_accessible();

			/* Rating components */
//			document.getElementById("wot-rating-4").hidden =
//				!wot_prefs.show_application_4;

			/* Partner */
//			this.show_partner();
		} catch (e) {
			dump("wot_ui.show_elements: failed with " + e + "\n");
		}
	},

	update: function(description)
	{
		try {
			wot_commands.update();
			this.show_elements();
//			this.update_title(description);
//			this.update_rating();
//			this.update_testimonies();
//			this.update_scorecard();
//			this.update_users();
//			this.update_message();
		} catch (e) {
			dump("wot_ui.update: failed with " + e + "\n");
		}
	},

//	update_rating: function()
//	{
//		try {
//			var cached = wot_cache.isok(wot_core.hostname);
//
//			for (var i = 0; i < WOT_COMPONENTS.length; ++i) {
//                var a = WOT_COMPONENTS[i],
//				    rep_elem = this.getElem("wot-rating-" + a + "-reputation"),
//				    conf_elem = this.getElem("wot-rating-" + a + "-confidence"),
//                    rep = -1,
//                    cnf = -1,
//                    exl,
//                    level;
//
//				if (cached) {
//					rep = wot_cache.get(wot_core.hostname, "reputation_" + a);
//					cnf = wot_cache.get(wot_core.hostname, "confidence_" + a);
//					exl = wot_cache.get(wot_core.hostname, "excluded_" + a);
//				}
//
//				if (rep_elem) {
//					if (exl) {
//						rep_elem.setAttribute("reputation", "excluded");
//					} else if (rep >= 0) {
//						rep_elem.setAttribute("reputation", wot_util.get_level(WOT_REPUTATIONLEVELS, rep).level);
//					} else if (cached) {
//						rep_elem.setAttribute("reputation", 0);
//					} else {
//						rep_elem.removeAttribute("reputation");
//					}
//				}
//
//				if (conf_elem) {
//                    level = exl ? 0 : wot_util.get_level(WOT_CONFIDENCELEVELS, cnf).level;
//                    conf_elem.setAttribute("confidence", level);
//				}
//			}
//		} catch (e) {
//			wdump("wot_ui.update_rating: failed with " + e);
//		}
//	},

//	/* Updates the testimony element */
//	update_testimonies: function(hover, pos)
//	{
//		try {
//			var cached = wot_cache.isok(wot_core.hostname);
//
//			/* Sliders for components */
//			for (var i = 0, a = 0; i < WOT_COMPONENTS.length; ++i) {
//                a = WOT_COMPONENTS[i];
//				/* Slider elements */
//				var stack     = this.getElem("wot-rating-" +	a + "-stack");
//				var indicator = this.getElem("wot-rating-" +	a + "-indicator");
//
//				if (!stack || !indicator) {
//					continue;
//				}
//
//				var testimony = -1;
//				if (cached) {
//					testimony = wot_cache.get(wot_core.hostname, "testimony_" + a);
//				}
//
//				if (testimony >= 0) {
//					indicator.left = testimony * this.SLIDER_WIDTH / WOT_MAX_REPUTATION;
//					if (testimony == WOT_MAX_REPUTATION) {
//						--indicator.left;
//					}
//					stack.setAttribute("testimony", "true");
//				} else if (hover != null && a == hover) {
//					indicator.left = pos * this.SLIDER_WIDTH / WOT_MAX_REPUTATION;
//					if (pos == WOT_MAX_REPUTATION) {
//						--indicator.left;
//					}
//					stack.setAttribute("testimony", "hover");
//				} else {
//					stack.setAttribute("testimony", "false");
//				}
//
//				var help = this.getElem("wot-rating-" + a + "-help-text"),
//				    link = this.getElem("wot-rating-" + a + "-help-link");
//
//				if (help && link) {
//					if (testimony >= WOT_MIN_REPUTATION_5) {
//						help.value = wot_util.getstring("help_5");
//					} else if (testimony >= WOT_MIN_REPUTATION_4) {
//						help.value = wot_util.getstring("help_4");
//					} else if (testimony >= WOT_MIN_REPUTATION_3) {
//						help.value = wot_util.getstring("help_3");
//					} else if (testimony >= WOT_MIN_REPUTATION_2) {
//						help.value = wot_util.getstring("help_2");
//					} else if (testimony >= 0) {
//						help.value = wot_util.getstring("help_1");
//					} else {
//						help.value = "";
//					}
//
//					link.removeAttribute("comment");
//					link.value = "";
//
//					if (cached && testimony >= 0) {
//						var r = wot_cache.get(wot_core.hostname, "reputation_" + a);
//						if (r != null && r >= 0 &&
//							Math.abs(r - testimony) > WOT_MIN_COMMENT_DIFF) {
//							help.value = wot_util.getstring("help_comment");
//							link.value = wot_util.getstring("help_comment_link");
//							link.setAttribute("comment", "true");
//						}
//					}
//
//					help.hidden = (!help.value || !help.value.length);
//				}
//			}
//		} catch (e) {
//			dump("wot_ui.update_testimonies: failed with " + e + "\n");
//		}
//	},

//	update_scorecard: function()
//	{
//	},

	update_message: function()
	{
		try {
			var msg = this.getElem("wot-message");
			var txt = this.getElem("wot-message-text");

			if (!msg || !txt || !txt.firstChild) {
				return;
			}

			if (wot_api_query.message.length == 0 ||
					wot_api_query.message_type.length == 0) {
				msg.hidden = true;
				txt.firstChild.nodeValue = "";
				return;
			}

			txt.firstChild.nodeValue = wot_api_query.message;
			txt.setAttribute("url-type",
				wot_api_query.message_url.substring(0,4));
			msg.setAttribute("message-status", wot_api_query.message_type);
			msg.hidden = false;
		} catch (e) {
			dump("wot_ui.update_message: failed with " + e + "\n");
		}
	},

//	update_users: function()
//	{
//		try {
//			if (!wot_api_query.users) {
//				return;
//			}
//
//			var i, j = 0;
//
//			for (i = 0; i < wot_api_query.users.length; ++i) {
//				var user    = this.getElem("wot-user-" + j);
//				var content = this.getElem("wot-user-" + j + "-content");
//				var stack   = this.getElem("wot-user-" + j + "-stack");
//				var header  = this.getElem("wot-user-" + j + "-header");
//				var bar     = this.getElem("wot-user-" + j + "-bar-image");
//				var label   = this.getElem("wot-user-" + j + "-bar-text");
//				var text    = this.getElem("wot-user-" + j + "-text");
//				var notice  = this.getElem("wot-user-" + j + "-notice");
//
//				if (!user || !header || !bar || !label || !text || !notice) {
//					return;
//				}
//
//				if (wot_api_query.users[i].bar &&
//						wot_api_query.users[i].length != null &&
//						wot_api_query.users[i].label) {
//					header.value = wot_api_query.users[i].bar;
//					label.value = wot_api_query.users[i].label;
//					bar.setAttribute("length", wot_api_query.users[i].length);
//					bar.hidden = false;
//				} else {
//					header.value = "";
//					label.value = "";
//					bar.hidden = true;
//				}
//
//				if (wot_api_query.users[i].url) {
//					content.setAttribute("url", wot_api_query.users[i].url);
//				} else {
//					content.removeAttribute("url");
//				}
//
//				if (wot_api_query.users[i].notice) {
//					notice.value = wot_api_query.users[i].notice;
//					notice.hidden = false;
//				} else {
//					notice.hidden = true;
//				}
//
//				if (wot_api_query.users[i].text) {
//					text.value = wot_api_query.users[i].text;
//					user.hidden = false;
//					++j;
//				} else {
//					text.value = "";
//					user.hidden = true;
//				}
//			}
//		} catch (e) {
//			dump("wot_ui.update_users: failed with " + e + "\n");
//		}
//	},

	geticonurl: function(r, size, plain)
	{
        var image = wot_util.get_level(WOT_REPUTATIONLEVELS, r).name,
		    base = "chrome://wot/skin/fusion/";

		if (r >= -1 && wot_prefs.accessible) {
			base += "accessible/";
		}

		return base + size + "_" + size +
					((plain) ? "/plain/" : "/") + image + ".png";
	}
};
