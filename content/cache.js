/*
	cache.js
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

var wot_hashtable =
{
	load_delayed: function()
	{
		try {
			if (this.bag) {
				return;
			}
			this.bag = Components.classes["@mozilla.org/hash-property-bag;1"].
						getService(Components.interfaces.nsIWritablePropertyBag);
		} catch (e) {
			dump("wot_hashtable.init: failed with: " + e + "\n");
		}
	},

	unload: function()
	{
		this.bag = null;
	},

	set: function(name, value)
	{
		try {
			this.bag.setProperty(name, value);
		} catch (e) {
			dump("wot_hashtable.set: failed with " + e + "\n");
		}
	},

	get: function(name)
	{
		try {
			return this.bag.getProperty(name);
		} catch (e) {
		}
		return null;
	},

	remove: function(name)
	{
		try {
			this.bag.deleteProperty(name);
		} catch (e) {
		}
	},

	get_enumerator: function(name)
	{
		try {
			return this.bag.enumerator;
		} catch (e) {
			dump("wot_hashtable.get_enumerator: failed with " + e + "\n");
		}
		return null;
	}
};

wot_modules.push({ name: "wot_hashtable", obj: wot_hashtable });

/* Cache status */
const WOT_QUERY_ERROR = 0;	/* Failed */
const WOT_QUERY_OK    = 1;	/* Successful */
const WOT_QUERY_RETRY = 2;	/* Request or cache timed out, retry */
const WOT_QUERY_LINK  = 3;	/* Incomplete for a query use, retry */

const WOT_PREFIX_CACHE = "wot_cache";
const WOT_PREFIX_NONCE = "wot_nonce";
const WOT_CNRE = RegExp(WOT_PREFIX_CACHE + "\:(.+)\:exists");

var wot_cache =
{
	get_nonce_name: function(nonce)
	{
		if (!nonce) {
			return null;
		}

		return WOT_PREFIX_NONCE + ":" + nonce;
	},

	add_nonce: function(nonce, name)
	{
		var nn = this.get_nonce_name(nonce);

		if (!nn) {
			return;
		}

		wot_hashtable.set(nn, name);
	},

	resolve_nonce: function(nonce)
	{
		var nn = this.get_nonce_name(nonce);

		if (!nn) {
			return null;
		}

		return wot_hashtable.get(nn);
	},

	remove_nonce: function(nonce)
	{
		var nn = this.get_nonce_name(nonce);

		if (!nn) {
			return;
		}

		wot_hashtable.remove(nn);
	},

	get_property_name: function(name, property)
	{
		if (!name || !property) {
			return null;
		}

		var cn = wot_idn.utftoidn(name);

		if (!cn) {
			return null;
		}

		return WOT_PREFIX_CACHE + ":" + cn + ":" + property;
	},

	get: function(name, property)
	{
		if (!wot_util.isenabled()) {
			return null;
		}

		var pn = this.get_property_name(name, property);

		if (!pn) {
			return null;
		}

		return wot_hashtable.get(pn);
	},

	set: function(name, property, value)
	{
		var pn = this.get_property_name(name, property);

		if (!pn) {
			return;
		}

		wot_hashtable.set(pn, value);
	},

	remove: function(name, property)
	{
		var pn = this.get_property_name(name, property);

		if (!pn) {
			return;
		}

		wot_hashtable.remove(pn);
	},

	iscached: function(name)
	{
		return !!this.get(name, "exists");
	},

	isok: function(name)
	{
		if (this.iscached(name)) {
			var s = this.get(name, "status");
 			return (s == WOT_QUERY_OK ||
						(wot_prefs.prefetch && s == WOT_QUERY_LINK));
		}
		return false;
	},

	get_enumerator: function()
	{
		return wot_hashtable.get_enumerator();
	},

	get_name_from_element: function(element)
	{
		try {
			if (!element || !element.QueryInterface) {
				return null;
			}

			var property =
					element.QueryInterface(Components.interfaces.nsIProperty);

			if (!property) {
				return null;
			}

			if (property.name.lastIndexOf(":exists") < 0) {
				return null;
			}

			var match = property.name.match(WOT_CNRE);

			if (!match || !match[1]) {
				return null;
			}

			return match[1];
		} catch (e) {
			dump("wot_cache.get_name_from_element: failed with " + e + "\n");
		}
		return null;
	},

	create: function(name)
	{
		try {
			if (!name) {
				return;
			}

			var pending = false;

			if (this.iscached(name)) {
				pending = this.get(name, "pending");
			} else {
				this.set(name, "exists", true);
				this.set(name, "pending", false);
				this.set(name, "warned",  0);
			}

			this.set(name, "inprogress", false);
			this.set(name, "status", WOT_QUERY_RETRY);
			this.set(name, "time", Date.now());

			for (var i = 0; i < WOT_APPLICATIONS; ++i) {
				this.set(name, "reputation_" + i, -1);
				this.set(name, "confidence_" + i, -1);

				if (!pending) {
					this.set(name, "testimony_" + i, -1);
				}
				
				this.set(name, "inherited_" + i, 0);
				this.set(name, "lowered_" + i, 0);
			}
		} catch (e) {
			dump("wot_cache.create: failed with " + e + "\n");
		}
	},

	destroy: function(name)
	{
		try {
			if (!this.iscached(name) || this.get(name, "pending")) {
				return;
			}

			this.remove(name, "exists");
			this.remove(name, "pending");
			this.remove(name, "warned");
			this.remove(name, "inprogress");
			this.remove(name, "status");
			this.remove(name, "time");

			for (var i = 0; i < WOT_APPLICATIONS; ++i) {
				this.remove(name, "reputation_" + i);
				this.remove(name, "confidence_" + i);
				this.remove(name, "testimony_" + i);
				this.remove(name, "inherited_" + i);
				this.remove(name, "lowered_" + i);
			}
		} catch (e) {
			dump("wot_cache.destroy: failed with " + e + "\n");
		}
	},

	add_target: function(nonce, target, islink)
	{
		try {
			var index = target.attributes.getNamedItem(
							WOT_SERVICE_XML_QUERY_TARGET_INDEX);

			if (index && index.value != null) {
				nonce += "-" + index.value;
			}

			var name = this.resolve_nonce(nonce);

			if (!name) {
				dump("wot_cache.add_target: unknown nonce: " + nonce + "\n");
				return;
			}

			this.remove_nonce(nonce);

			if (!this.iscached(name)) {
				this.create(name);
			}

			var child = target.firstChild;
			var a, r, c, t, i, l, x;

			if (islink) {
				if (this.get(name, "status") == WOT_QUERY_OK) {
					dump("wot_cache.add_target: not overwriting on link for " +
						name + "\n");
					return;
				}
				this.set(name, "status", WOT_QUERY_LINK);
			} else {
				this.set(name, "status", WOT_QUERY_OK);
			}

			while (child) {
				if (child.localName == WOT_SERVICE_XML_QUERY_APPLICATION) {
					a = child.attributes.getNamedItem(
							WOT_SERVICE_XML_QUERY_APPLICATION_NAME);
					r = child.attributes.getNamedItem(
							WOT_SERVICE_XML_QUERY_APPLICATION_R);
					c = child.attributes.getNamedItem(
							WOT_SERVICE_XML_QUERY_APPLICATION_C);
					i = child.attributes.getNamedItem(
							WOT_SERVICE_XML_QUERY_APPLICATION_I);
					l = child.attributes.getNamedItem(
							WOT_SERVICE_XML_QUERY_APPLICATION_L);
					x = child.attributes.getNamedItem(
							WOT_SERVICE_XML_QUERY_APPLICATION_E);
					t = child.attributes.getNamedItem(
							WOT_SERVICE_XML_QUERY_APPLICATION_T);

					if (a && a.value) {
						if (r && r.value && c && c.value) {
							this.set(name, "reputation_" + a.value,
								Number(r.value));
							this.set(name, "confidence_" + a.value,
								Number(c.value));
						}
						if (i && i.value) {
							this.set(name, "inherited_" + a.value,
								Number(i.value));
						}
						if (l && l.value) {
							this.set(name, "lowered_" + a.value,
								Number(l.value));
						}
						if (x && x.value) {
							this.set(name, "excluded_" + a.value,
								Number(x.value));
						}
						if (t && t.value) {
							this.set(name, "testimony_" + a.value,
								Number(t.value));
						}
					} else {
						dump("wot_cache.add_target: application name missing\n");
					}
				}

				// process Feedback Question
				this.add_question(name, child);

				child = child.nextSibling;
			}
		} catch (e) {
			dump("wot_cache.add_target: failed with " + e + "\n");
		}
	},

	add_question: function (hostname, target_node)
	{
		if (target_node.localName == WOT_SERVICE_XML_QUERY_QUESTION) {

			try {
				var doc = target_node.ownerDocument;
				var id_node = doc.getElementsByTagName(WOT_SERVICE_XML_QUERY_QUESTION_ID).item(0),
					text_node = doc.getElementsByTagName(WOT_SERVICE_XML_QUERY_QUESTION_TEXT).item(0),
					choices_nodes = doc.getElementsByTagName(WOT_SERVICE_XML_QUERY_CHOICE_TEXT);

				if (id_node && id_node.firstChild && text_node && text_node.firstChild) {
					var id = String(id_node.firstChild.nodeValue),
						text = String(text_node.firstChild.nodeValue);

					if (id && text) {

						var choice = choices_nodes.item(0),
							choices = [];

						while(choice) {

							var choice_text = choice.firstChild.nodeValue;
							var choice_value = choice.attributes.getNamedItem("value").value;

							if (choice_text && choice_value) {
								choices.push({ value: choice_value, text: choice_text });
							}

							choice = choice.nextSibling;
						}

						// now store question data to global WOT cache (if there are any choices)
						if (choices.length) {
							this.set(hostname, "question_id", id);
							this.set(hostname, "question_text", text);
							this.set(hostname, "choices_number", Number(choices.length));
							for(var j=0; j < choices.length; j++) {
								this.set(hostname, "choice_value_" + String(j), choices[j]['value']);
								this.set(hostname, "choice_text_" + String(j), choices[j]['text']);
							}
						}
					}
				}
			} catch(e) {
				dump("Failed to extract Question data from XML\n");
			}
		}
	},

	add_query: function(queries, targets, islink)
	{
		try {
			if (!queries) {
				dump("wot_cache.add_query: root element missing\n");
				return;
			}

			var q = queries.item(0);

			if (!q) {
				dump("wot_cache.add_query: root element missing\n");
				return;
			}

			var nonce =
				q.attributes.getNamedItem(WOT_SERVICE_XML_QUERY_NONCE);

			if (!nonce || !nonce.value) {
				dump("wot_cache.add_query: nonce attribute missing\n");
				return;
			}

			if (!targets) {
				dump("wot_cache.add_query: target elements missing\n");
				return;
			}

			var i = 0;
			var t = targets.item(0);

			while (t) {
				this.add_target(nonce.value, t, islink);
				t = targets.item(++i);
			}
		} catch (e) {
			dump("wot_cache.add_query: failed with " + e + "\n");
		}
	}
};
