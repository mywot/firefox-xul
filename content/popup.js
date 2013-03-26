/*
	popup.js
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

const WOT_POPUP_LAYER =
	"<div id=\"wot-logo\"></div>" +
	"<div id=\"wot-popup-ratings-ID\" class=\"wot-popup-ratings\">" +
		"<div id=\"wot-r0-stack-ID\" class=\"wot-stack\">" +
			"<div id=\"wot-r0-header-ID\" class=\"wot-header\">WOT_POPUP_TEXT_0</div>" +
			"<div id=\"wot-r0-rep-ID\" class=\"wot-rep\"></div>" +
			"<div id=\"wot-r0-cnf-ID\" class=\"wot-cnf\"></div>" +
		"</div>" +
		"<div id=\"wot-r1-stack-ID\" class=\"wot-stack\">" +
			"<div id=\"wot-r1-header-ID\" class=\"wot-header\">WOT_POPUP_TEXT_1</div>" +
			"<div id=\"wot-r1-rep-ID\" class=\"wot-rep\"></div>" +
			"<div id=\"wot-r1-cnf-ID\" class=\"wot-cnf\"></div>" +
		"</div>" +
		"<div id=\"wot-r2-stack-ID\" class=\"wot-stack\">" +
			"<div id=\"wot-r2-header-ID\" class=\"wot-header\">WOT_POPUP_TEXT_2</div>" +
			"<div id=\"wot-r2-rep-ID\" class=\"wot-rep\"></div>" +
			"<div id=\"wot-r2-cnf-ID\" class=\"wot-cnf\"></div>" +
		"</div>" +
		"<div id=\"wot-r4-stack-ID\" class=\"wot-stack\">" +
			"<div id=\"wot-r4-header-ID\" class=\"wot-header\">WOT_POPUP_TEXT_4</div>" +
			"<div id=\"wot-r4-rep-ID\" class=\"wot-rep\"></div>" +
			"<div id=\"wot-r4-cnf-ID\" class=\"wot-cnf\"></div>" +
		"</div>" +
	"</div>";

const WOT_POPUP_STYLE =
	"@import \"chrome://wot/skin/include/popup.css\";";

var wot_popup =
{
	offsety:		15,
	offsetx:		0,
	height:			235,
	width:			137,
	ratingheight:	52,
	areaheight:		214,
	barsize:		20,
	offsetheight:	0,
	postfix:		"-" + Date.now(),
	id:				"wot-popup-layer",
	onpopup:		false,

	load_delayed: function()
	{
		try {
			if (this.browser) {
				return;
			}

			this.appearance = 0;
			this.browser = document.getElementById("appcontent");
			this.id += this.postfix;

			if (this.browser) {
				this.browser.addEventListener("mouseover",
					wot_popup.onmouseover, false);
			}
		} catch (e) {
			dump("wot_popup.load: failed with " + e + "\n");
		}
	},

	unload: function()
	{
		try {
			if (this.browser) {
				this.browser.removeEventListener("mouseover",
						wot_popup.onmouseover, false);
				this.browser = null;
			}
		} catch (e) {
			dump("wot_popup.unload: failed with " + e + "\n");
		}
	},

	addpopup: function(content, elem)
	{
		try {
			if (!wot_prefs.show_search_popup) {
				return false;
			}

			if (!this.layer) {
				this.layer = WOT_POPUP_LAYER;
				this.layer = this.layer.replace(/-ID/g,
					this.postfix);
				this.layer = this.layer.replace(/WOT_POPUP_TEXT_0/g,
					wot_util.getstring("popup_0") + ":");
				this.layer = this.layer.replace(/WOT_POPUP_TEXT_1/g,
					wot_util.getstring("popup_1") + ":");
				this.layer = this.layer.replace(/WOT_POPUP_TEXT_2/g,
					wot_util.getstring("popup_2") + ":");
				this.layer = this.layer.replace(/WOT_POPUP_TEXT_4/g,
					wot_util.getstring("popup_4") + ":");
			}

			if (content.getElementById(this.id)) {
				return true;
			}

			var layer = content.createElement("div");
			layer.setAttribute("id", this.id);
			layer.setAttribute("class", "wot-popup-layer");
			layer.setAttribute("style", "display: none; cursor: pointer;");
			layer.innerHTML = this.layer;

			var style = content.createElement("style");
			style.setAttribute("type", "text/css");
			style.innerHTML = WOT_POPUP_STYLE;

			if (!elem) {
				var body = content.getElementsByTagName("body");

				if (body && body.length) {
					elem = body[0];
				}
			}

			var head = content.getElementsByTagName("head");

			if (!elem || !head || !head.length) {
				return false;
			}

			layer.addEventListener("click", function() {
					wot_browser.openscorecard(layer.getAttribute("target"),
						null, WOT_URL_POPUPVIEWSC);
				}, false);

			elem.appendChild(layer);
			head[0].appendChild(style);

			return true;
		} catch (e) {
			dump("wot_popup.addpopup: failed with " + e + "\n");
		}
		return false;
	},

	loadlayer: function(content, layer, target)
	{
		try {
			var status = wot_cache.get(target, "status");

			if (status != WOT_QUERY_OK && status != WOT_QUERY_LINK) {
				return false;
			}

			var cls = layer.getAttribute("class");

			if (wot_prefs.accessible) {

				if (!cls || !cls.length) {
					cls = "accessible";
				} else if (cls.indexOf("accessible") < 0) {
					cls += " accessible";
				}

				layer.setAttribute("class", cls);
			} else if (cls && cls.indexOf("accessible") >= 0) {
				cls = cls.replace(/accessible/g, "");
				layer.setAttribute("class", cls);
			}

			for (var i = 0; i < WOT_APPLICATIONS; ++i) {
				var rep = content.getElementById("wot-r" + i + "-rep" +
							this.postfix);
				var cnf = content.getElementById("wot-r" + i + "-cnf" +
							this.postfix);

				if (!rep || !cnf) {
					continue;
				}

				var r = wot_cache.get(target, "reputation_" + i);
				var c = wot_cache.get(target, "confidence_" + i);
				var x = wot_cache.get(target, "excluded_" + i);

				if (x) {
					rep.setAttribute("reputation", "excluded");
				} else if (r >= WOT_MIN_REPUTATION_5) {
					rep.setAttribute("reputation", 5);
				} else if (r >= WOT_MIN_REPUTATION_4) {
					rep.setAttribute("reputation", 4);
				} else if (r >= WOT_MIN_REPUTATION_3) {
					rep.setAttribute("reputation", 3);
				} else if (r >= WOT_MIN_REPUTATION_2) {
					rep.setAttribute("reputation", 2);
				} else if (r >= 0) {
					rep.setAttribute("reputation", 1);
				} else {
					rep.setAttribute("reputation", 0);
				}

				if (x) {
					cnf.setAttribute("confidence", 0);
				} else if (c >= WOT_MIN_CONFIDENCE_5) {
					cnf.setAttribute("confidence", 5);
				} else if (c >= WOT_MIN_CONFIDENCE_4) {
					cnf.setAttribute("confidence", 4);
				} else if (c >= WOT_MIN_CONFIDENCE_3) {
					cnf.setAttribute("confidence", 3);
				} else if (c >= WOT_MIN_CONFIDENCE_2) {
					cnf.setAttribute("confidence", 2);
				} else if (c >= WOT_MIN_CONFIDENCE_1) {
					cnf.setAttribute("confidence", 1);
				} else {
					cnf.setAttribute("confidence", 0);
				}
			}

			wot_popup.offsetheight = 0;
			var bottom = content.getElementById("wot-r0-stack" +
							this.postfix);

			if (wot_prefs.show_application_1) {
				bottom = content.getElementById("wot-r1-stack" +
							this.postfix);
				bottom.style.display = "block";
			} else {
				content.getElementById("wot-r1-stack" +
					this.postfix).style.display = "none";
				wot_popup.offsetheight -= wot_popup.ratingheight;
			}
			if (wot_prefs.show_application_2) {
				bottom = content.getElementById("wot-r2-stack" +
							this.postfix);
				bottom.style.display = "block";
			} else {
				content.getElementById("wot-r2-stack" +
					this.postfix).style.display = "none";
				wot_popup.offsetheight -= wot_popup.ratingheight;
			}
			if (wot_prefs.show_application_4) {
				bottom = content.getElementById("wot-r4-stack" +
							this.postfix);
				bottom.style.display = "block";
			} else {
				content.getElementById("wot-r4-stack" +
					this.postfix).style.display = "none";
				wot_popup.offsetheight -= wot_popup.ratingheight;
			}
			bottom.style.borderBottom = "0";
			content.getElementById("wot-popup-ratings" +
				this.postfix).style.height =
				wot_popup.offsetheight + wot_popup.areaheight + "px";
			return true;
		} catch (e) {
			dump("wot_popup.loadlayer: failed with " + e + "\n");
		}
		return false;
	},

	hidelayer: function(content, appearance)
	{
		try {
			var layer = content.getElementById(this.id);

			if (layer && layer.style.display != "none" &&
					(appearance == null || appearance == this.appearance) &&
					!this.onpopup) {
				layer.style.display = "none";
			}
		} catch (e) {
			/* dump("wot_popup.hidelayer: failed with " + e + "\n"); */
		}
	},

	findelem: function(event)
	{
		try {
			var elem = event.originalTarget;
			var attr = null;
			var onpopup = false;

			while (elem) {
				if (elem.attributes) {
					attr = elem.attributes.getNamedItem(wot_search.attribute);
					if (attr && attr.value) {
						break;
					}
					attr = null;
					if (elem.id == this.id) {
						onpopup = true;
					}
				}
				elem = elem.parentNode;
			}

			this.onpopup = onpopup;

			if (!elem || !attr) {
				return null;
			}

			return elem;
		} catch (e) {
			dump("wot_popup.findelem: failed with " + e + "\n");
		}
		return null;
	},

	onmouseover: function(event)
	{
		try {
			if (!wot_util.isenabled() || !wot_prefs.show_search_popup ||
					!event || !event.view) {
				return;
			}

			var content = event.view.document;

			if (!content) {
				return;
			}
			
			var layer = content.getElementById(wot_popup.id);

			if (!layer) {
				return;
			}

			wot_popup.target = wot_popup.findelem(event);

			if (!wot_popup.target) {
				var appearance = wot_popup.appearance;

				window.setTimeout(function() {
						wot_popup.hidelayer(content, appearance);
					}, wot_prefs.popup_hide_delay);

				return;
			}

			var attr = wot_popup.target.attributes.getNamedItem(
							wot_search.attribute);
			var target = attr.value;

			if (layer.style.display == "block" &&
					layer.getAttribute("target") == target) {
				return;
			}

			layer.setAttribute("target", target);

			if (!wot_popup.loadlayer(content, layer, target)) {
				wot_popup.hidelayer(content);
				return;
			}

			var popupheight = wot_popup.height + wot_popup.offsetheight;
			
			layer.style.height = popupheight + "px";
			layer.style.width  = wot_popup.width  + "px";

			var height = event.view.innerHeight - wot_popup.barsize;
			var width  = event.view.innerWidth  - wot_popup.barsize;

			if (height < popupheight ||	width < wot_popup.width) {
				wot_popup.hidelayer(content);
				return
			}

			var vscroll = event.view.pageYOffset;
			var hscroll = event.view.pageXOffset;

			// more accurate way to calc position
			// got from http://javascript.ru/ui/offset
			var elem = wot_popup.target;
			var box = elem.getBoundingClientRect();

			var docElem = content.documentElement;
			var body = content.body;
			var scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop;
			var scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft;
			var clientTop = docElem.clientTop || body.clientTop || 0;
			var clientLeft = docElem.clientLeft || body.clientLeft || 0;
			var y  = box.top +  scrollTop - clientTop;
			var x = box.left + scrollLeft - clientLeft;

			var posy = wot_popup.offsety + y + wot_popup.target.offsetHeight;
			var posx = wot_popup.offsetx + x + wot_popup.target.offsetWidth;

			if (posy + popupheight > height + vscroll) {
				posy = y - popupheight - wot_popup.offsety;
			}

			if (posx - hscroll < 0) {
				posx = hscroll;
			} else if ((posx + wot_popup.width) > (width + hscroll)) {
				posx = width - wot_popup.width + hscroll;
			}
			
			var appearance = ++wot_popup.appearance;

			if (layer.style.display != "none") {
				layer.style.top  = posy + "px";
				layer.style.left = posx + "px";
			} else {
				window.setTimeout(function() {
						if (wot_popup.target &&
								appearance == wot_popup.appearance) {
							layer.style.top  = posy + "px";
							layer.style.left = posx + "px";
							layer.style.display = "block";
						}
					}, wot_prefs.popup_show_delay);
			}
		} catch (e) {
			dump("wot_popup.onmouseover: failed with " + e + "\n");
		}
	}
};

wot_modules.push({ name: "wot_popup", obj: wot_popup });
