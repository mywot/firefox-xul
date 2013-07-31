/*
	api.js
	Copyright © 2005 - 2013  WOT Services Oy <info@mywot.com>

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

var wot_api_link =
{
	call: function(rule, content, batch, retrycount)
	{
		try {
			var hosts = batch.join("/") + "/";

			/* split into two requests if the parameter is too long */
			if (hosts.length > WOT_MAX_LINK_HOSTSLEN &&
					batch.length > 1) {
				this.call(rule, content, batch.splice(0, batch.length / 2),
					retrycount);
				this.call(rule, content, batch, retrycount);
				return;
			}

			var nonce = wot_crypto.nonce();

			for (var i = 0; i < batch.length; ++i) {
				wot_cache.add_nonce(nonce + "-" + i, batch[i]);
			}

			var context = wot_arc4.create(wot_hash.hmac_sha1hex(
								wot_prefs.witness_key, nonce));

			if (!context) {
				return;
			}

			var crypted = wot_arc4.crypt(context, wot_hash.strtobin(hosts));

			if (!crypted) {
				return;
			}

			var qs = WOT_SERVICE_API_LINK +
				"?id="		+ wot_prefs.witness_id +
				"&nonce="	+ nonce +
				"&hosts="	+ encodeURIComponent(btoa(
									wot_hash.bintostr(crypted))) +
				wot_url.getapiparams();

			if (wot_prefs.prefetch) {
				qs += "&mode=prefetch";
			}

			var request = new XMLHttpRequest();

			request.open("GET", wot_core.wot_service_url() +
					wot_crypto.authenticate_query(qs));

			new wot_cookie_remover(request);

			request.onload = function(event)
			{
				try {
					if (request.status == 200) {
						wot_cache.add_query(
							request.responseXML.getElementsByTagName(
								WOT_SERVICE_XML_LINK),
							request.responseXML.getElementsByTagName(
								WOT_SERVICE_XML_QUERY_TARGET),
							true);
			
						var cache = {};
						var retry = {};
						var hasretries = false;
					
						for (var i = 0; i < batch.length; ++i) {
							var s = wot_cache.get(batch[i], "status");

							if (s == WOT_QUERY_OK || s == WOT_QUERY_LINK) {
								cache[batch[i]] = batch[i];
							} else if (wot_shared.isencodedhostname(batch[i])) {
								retry[batch[i]] = batch[i];
								hasretries = true;
							}
						}

						if (rule) {
							wot_search.update(rule, content, cache, true);
						}

						retrycount = retrycount || 0;

						if (hasretries && ++retrycount <= WOT_MAX_TRIES_LINK) {
							window.setTimeout(function() {
									wot_api_link.send(rule, content, retry,
										retrycount);
								}, WOT_INTERVAL_LINK_RETRY);
						}
					}

					for (var i = 0; i < batch.length; ++i) {
						wot_cache.remove_nonce(nonce + "-" + i);
					}
				} catch (e) {
					dump("wot_api_link.onload: failed with " + e + "\n");
				}
			}

			request.send(null);
		} catch (e) {
			dump("wot_api_link.call: failed with " + e + "\n");
		}
	},

	send: function(rule, content, cache, retrycount)
	{
		try {
			if (!wot_util.isenabled()) {
				return;
			}

			var fetch = [];

			for (var i in cache) {
				if (cache[i] != i ||
						(wot_cache.iscached(i) && (wot_cache.get(i, "pending") ||
						 wot_cache.get(i, "inprogress")))) {
					continue;
				}

				fetch.push(i);
			}

			while (fetch.length > 0) {
				this.call(rule, content, fetch.splice(0, WOT_MAX_LINK_PARAMS),
					retrycount);
			}
		} catch (e) {
			dump("wot_api_link.send: failed with " + e + "\n");
		}
	}
};

var wot_api_query =
{
	message: "",
	message_id: "",
	message_type: "",
	message_url: "",
	users: [],

	send: function(hostname, callback)
	{
		try {
			if (!wot_util.isenabled()) {
				return false;
			}

			if (wot_cache.iscached(hostname) &&
					(wot_cache.get(hostname, "pending") ||
						wot_cache.get(hostname, "inprogress"))) {
				return false;
			}

			wot_cache.create(hostname);
			wot_cache.set(hostname, "time", Date.now());
			wot_cache.set(hostname, "inprogress", true);
			wot_cache.set(hostname, "status", WOT_QUERY_ERROR);

			var nonce = wot_crypto.nonce();

			var context = wot_arc4.create(wot_hash.hmac_sha1hex(
								wot_prefs.witness_key, nonce));

			if (!context) {
				wot_cache.set(hostname, "inprogress", false);
				return false;
			}

			var crypted = wot_arc4.crypt(context, wot_hash.strtobin(
								wot_idn.utftoidn(hostname)));

			if (!crypted) {
				wot_cache.set(hostname, "inprogress", false);
				return false;
			}

			var qs = WOT_SERVICE_API_QUERY +
				"?id=" 		+ wot_prefs.witness_id +
				"&nonce="	+ nonce +
				"&target="	+ encodeURIComponent(btoa(
									wot_hash.bintostr(crypted))) +
				wot_url.getapiparams();

			var request = new XMLHttpRequest();

			wot_cache.add_nonce(nonce, hostname);

			request.open("GET", wot_core.wot_service_url() +
				wot_crypto.authenticate_query(qs));

			new wot_cookie_remover(request);

			/* If we don't receive data reasonably soon, retry */
			var timeout =
				window.setTimeout(function() {
						wot_api_query.timeout(request, hostname, callback);
					},	WOT_TIMEOUT_QUERY);

			request.onload = function(ev)
			{
				try {
					if (timeout) {
						window.clearTimeout(timeout);
					}

					wot_cache.set(hostname, "time", Date.now());

					if (request.status == 200) {
						wot_cache.add_query(
							request.responseXML.getElementsByTagName(
								WOT_SERVICE_XML_QUERY),
							request.responseXML.getElementsByTagName(
								WOT_SERVICE_XML_QUERY_TARGET),
							false);

						wot_api_query.parse_messages(
							request.responseXML.getElementsByTagName(
									WOT_SERVICE_XML_QUERY_MSG));

						wot_api_query.parse_users(
							request.responseXML.getElementsByTagName(
									WOT_SERVICE_XML_QUERY_USER));

						wot_api_query.parse_status(
							request.responseXML.getElementsByTagName(
									WOT_SERVICE_XML_QUERY_STATUS));
					}

					wot_cache.set(hostname, "inprogress", false);
					wot_cache.remove_nonce(nonce);
					wot_core.update();

					if (typeof(callback) == "function") {
						callback();
					}
				} catch (e) {
					dump("wot_api_query.onload: failed with " + e + "\n");
				}
			};

			request.send();
			return true;
		} catch (e) {
			dump("wot_api_query.send: failed with " + e + "\n");
		}
		return false;
	},

	timeout: function(request, hostname, callback) /* XMLHttpRequest */
	{
		try {
			if (!wot_cache.get(hostname, "inprogress")) {
				return;
			}

			dump("wot_api_query.timeout: for " + hostname + "\n");

			request.abort();
			wot_cache.set(hostname, "time", Date.now());
			wot_cache.set(hostname, "inprogress", false);
			wot_core.update();
			
			if (typeof(callback) == "function") {
				callback();
			}
		} catch (e) {
			dump("wot_api_query.timeout: failed with " + e + "\n");
		}
	},

	parse_messages: function(messages)
	{
		try {
			if (!messages) {
				return;
			}

			var i = 0;
			var m = messages.item(0);
			var msgid, type, target, version, than, url;

			while (m) {
				/* Display the first message that is targeted to us */
				msgid	= m.attributes.getNamedItem(WOT_SERVICE_XML_QUERY_MSG_ID);
				type    = m.attributes.getNamedItem(WOT_SERVICE_XML_QUERY_MSG_TYPE);
				url     = m.attributes.getNamedItem(WOT_SERVICE_XML_QUERY_MSG_URL);
				target  = m.attributes.getNamedItem(WOT_SERVICE_XML_QUERY_MSG_TARGET);
				version = m.attributes.getNamedItem(WOT_SERVICE_XML_QUERY_MSG_VERSION);
				than    = m.attributes.getNamedItem(WOT_SERVICE_XML_QUERY_MSG_THAN);

				/* Must have mandatory fields */
				if (msgid && msgid.value && type && type.value &&
					target && target.value &&
					m.firstChild && m.firstChild.nodeValue &&
						(target.value == WOT_SERVICE_XML_QUERY_MSG_TARGET_ALL ||
							target.value == WOT_PLATFORM)) {
					/* A message targeted to our platform */
					if (version && version.value && than && than.value) {
						/* A versioned message */
						if ((version.value ==
									WOT_SERVICE_XML_QUERY_MSG_VERSION_EQ &&
								Number(WOT_VERSION) == Number(than.value)) ||
							(version.value ==
									WOT_SERVICE_XML_QUERY_MSG_VERSION_LE &&
								Number(WOT_VERSION) <= Number(than.value)) ||
							(version.value ==
									WOT_SERVICE_XML_QUERY_MSG_VERSION_GE &&
								Number(WOT_VERSION) >= Number(than.value))) {
							/* Targeted to us */
							this.message_id = msgid.value;
							this.message_type = type.value;
							this.message = m.firstChild.nodeValue;
							if (url && url.value) {
								this.message_url = url.value;
							}
							break;
						}
					} else {
						/* Targeted to us */
						this.message_id = msgid.value;
						this.message_type = type.value;
						this.message = m.firstChild.nodeValue;
						if (url && url.value) {
							this.message_url = url.value;
						}
						break;
					}
				}

				m = messages.item(++i);
			}
		} catch (e) {
			dump("wot_api_query.parse_messages: failed with " + e + "\n");
		}
	},

	parse_users: function(users)
	{
		try {
			this.users = [];

			if (!users) {
				return;
			}

			var i = 0;
			var u = users.item(0);
			var a;

			while (u) {
				var item = {};
				a = u.attributes.getNamedItem(WOT_SERVICE_XML_QUERY_USER_ICON);

				if (a && a.value) {
					item.icon = a.value;
				}

				a = u.attributes.getNamedItem(WOT_SERVICE_XML_QUERY_USER_BAR);

				if (a && a.value) {
					item.bar = a.value;
				}

				a = u.attributes.getNamedItem(WOT_SERVICE_XML_QUERY_USER_LENGTH);

				if (a && a.value) {
					item.length = a.value;
				}

				a = u.attributes.getNamedItem(WOT_SERVICE_XML_QUERY_USER_LABEL);

				if (a && a.value) {
					item.label = a.value;
				}

				a = u.attributes.getNamedItem(WOT_SERVICE_XML_QUERY_USER_URL);

				if (a && a.value) {
					item.url = a.value;
				}

				a = u.attributes.getNamedItem(WOT_SERVICE_XML_QUERY_USER_TEXT);

				if (a && a.value) {
					item.text = a.value;
				}

				a = u.attributes.getNamedItem(WOT_SERVICE_XML_QUERY_USER_NOTICE);

				if (a && a.value) {
					item.notice = a.value;
				}

				if (item.text && (!item.bar ||
						(item.length != null && item.label))) {
					this.users[i] = item;
				}

				u = users.item(++i);
			}
		} catch (e) {
			dump("wot_api_query.parse_users: failed with " + e + "\n");
		}
	},

	parse_status: function(stats)
	{
		try {
			wot_prefs.clear("status_level");

			if (!stats) {
				return;
			}

			var s = stats.item(0);

			if (!s) {
				return;
			}

			var l = s.attributes.getNamedItem(WOT_SERVICE_XML_QUERY_STATUS_LEVEL);

			if (l && l.value) {
				wot_prefs.setChar("status_level", l.value);
			}

		} catch (e) {
			dump("wot_api_query.parse_status: failed with " + e + "\n");
		}
	}
};

const WOT_REGISTER_RUNNING = "wot_register_running";

var wot_api_register =
{
	ready: false,
	tries: 0,

	geteid: function()
	{
		try {
			if (wot_prefs.extension_id && wot_prefs.extension_id.length > 0) {
				return true;
			}
			if (!wot_prefs.setChar("extension_id", wot_crypto.nonce())) {
				return false;
			}
			return (wot_prefs.extension_id.length > 0);
		} catch (e) {
			dump("wot_api_register.geteid: failed with " + e + "\n");
		}
		return false;
	},

	send: function()
	{
		try {
			if (this.ready) {
				return;
			}

			if (this.timeout) {
				window.clearTimeout(this.timeout);
				this.timeout = null;
			}

			if (wot_prefs.witness_id &&
				wot_prefs.witness_id.length  == WOT_LENGTH_WITNESS_ID &&
				wot_prefs.witness_key &&
				wot_prefs.witness_key.length == WOT_LENGTH_WITNESS_KEY) {
				this.ready = true;
				wot_core.update();
				return;
			}

			if (wot_browser.isoffline()) {
				wot_status.set("offline",
					wot_util.getstring("message_offline"));
				this.timeout = window.setTimeout(wot_api_register.send,
					WOT_INTERVAL_REGISTER_OFFLINE);
				return;
			}

			wot_status.set("notready",
				wot_util.getstring("messages_notready"));

			if (!this.geteid() ||
					wot_hashtable.get(WOT_REGISTER_RUNNING)) {
				this.timeout = window.setTimeout(wot_api_register.send,
					WOT_INTERVAL_REGISTER_ERROR);
				return;
			}

			wot_hashtable.set(WOT_REGISTER_RUNNING, 1);
			++this.tries;

			var request = new XMLHttpRequest();

			request.open("GET", WOT_SERVICE_SECURE +
				WOT_SERVICE_API_REGISTER +
				"?nonce="	+ wot_crypto.nonce() +
				"&eid="		+ wot_prefs.extension_id +
				wot_url.getapiparams());

			new wot_cookie_remover(request);

			request.onload = this.onload;
			request.send(null);
		} catch (e) {
			dump("wot_register.send: failed with " + e + "\n");
			this.error();
		}
	},

	onload: function(event)
	{
		try {
			if (!event || !event.target || event.target.status != 200 ||
					!event.target.responseXML) {
				wot_api_register.error();
				return;
			}

			var reg = null;
			var tags = event.target.responseXML.getElementsByTagName(
							WOT_SERVICE_XML_REGISTER);

			if (tags) {
				reg = tags.item(0);
			}

			if (!reg || !reg.attributes) {
				wot_api_register.error();
				return;
			}

			var id  = reg.attributes.getNamedItem(WOT_SERVICE_XML_REGISTER_ID);
			var key = reg.attributes.getNamedItem(WOT_SERVICE_XML_REGISTER_KEY);

			if (!id || !id.value || !key || !key.value ||
				id.value.length  != WOT_LENGTH_WITNESS_ID ||
				key.value.length != WOT_LENGTH_WITNESS_KEY) {
				wot_api_register.error();
				return
			}

			if (!wot_prefs.setChar("witness_id", id.value) ||
				!wot_prefs.setChar("witness_key", key.value)) {
				wot_api_register.error();
				return;
			}

			wot_api_register.ready = true;
			wot_my_session.update(true);
			wot_core.update();

			wot_hashtable.remove(WOT_REGISTER_RUNNING);
		} catch (e) {
			dump("wot_register.onload: failed with " + e + "\n");
			wot_api_register.error();
		}
	},

	error: function()
	{
		try {
			wot_status.set("error",
				wot_util.getstring("message_error_register"));

			wot_api_register.timeout =
				window.setTimeout(wot_api_register.send,
					wot_api_register.tries * WOT_INTERVAL_REGISTER_ERROR);

			wot_hashtable.remove(WOT_REGISTER_RUNNING);
		} catch (e) {
			dump("wot_register.error: failed with " + e + "\n");
		}
	}
};

const WOT_RELOAD_RUNNING = "wot_reload_running";

var wot_api_reload =
{
	send: function(reload)
	{
		try {
			if (this.timeout) {
				window.clearTimeout(this.timeout);
				this.timeout = null;
			}

			if (!wot_util.isenabled() ||
					!wot_api_register.geteid() ||
					wot_hashtable.get(WOT_RELOAD_RUNNING)) {
				return;
			}

			wot_hashtable.set(WOT_RELOAD_RUNNING, 1);

			var query_string = WOT_SERVICE_API_RELOAD +
				"?id="		+ wot_prefs.witness_id +
				"&nonce=" 	+ wot_crypto.nonce() +
				"&reload=" 	+ encodeURIComponent(reload) +
				"&eid="		+ wot_prefs.extension_id +
				wot_url.getapiparams();

			var request = new XMLHttpRequest();

			request.open("GET", WOT_SERVICE_SECURE +
				wot_crypto.authenticate_query(query_string));

			new wot_cookie_remover(request);

			request.onload = this.onload;
			request.send(null);
		} catch (e) {
			dump("wot_reload.send: failed with " + e + "\n");
			this.error();
		}
	},

	onload: function(event)
	{
		try {
			if (!event || !event.target || event.target.status != 200 ||
					!event.target.responseXML) {
				wot_api_reload.error();
				return;
			}

			var reload = null;
			var tags = event.target.responseXML.getElementsByTagName(
							WOT_SERVICE_XML_RELOAD);

			if (tags) {
				reload = tags.item(0);
			}

			if (!reload || !reload.attributes) {
				wot_api_reload.error();
				return;
			}

			var id  = reload.attributes.getNamedItem(
							WOT_SERVICE_XML_RELOAD_ID);
			var key = reload.attributes.getNamedItem(
							WOT_SERVICE_XML_RELOAD_KEY);

			if (!id || !id.value || !key || !key.value ||
				id.value.length  != WOT_LENGTH_WITNESS_ID ||
				key.value.length != WOT_LENGTH_WITNESS_KEY) {
				wot_api_reload.error();
				return;
			}

			if (!wot_prefs.setChar("witness_id", id.value) ||
				!wot_prefs.setChar("witness_key", key.value)) {
				wot_api_reload.error();
				return;
			}

			wot_my_session.update(false);

			/* Invalidate cache */
			var cache = wot_cache.get_enumerator();

			while (cache.hasMoreElements()) {
				var name = wot_cache.get_name_from_element(cache.getNext());
				if (name) {
					wot_cache.set(name, "status", WOT_QUERY_RETRY);
				}
			}

			wot_core.update();
			wot_hashtable.remove(WOT_RELOAD_RUNNING);
		} catch (e) {
			dump("wot_reload.onload: failed with " + e + "\n");
			wot_api_reload.error();
		}
	},

	error: function()
	{
		try {
			wot_api_reload.timeout =
				window.setTimeout(wot_api_reload.send,
					WOT_INTERVAL_RELOAD_ERROR);

			wot_hashtable.remove(WOT_RELOAD_RUNNING);
		} catch (e) {
			dump("wot_reload.error: failed with " + e + "\n");
		}
	}
};

var wot_api_submit =
{
	send: function(pref, target, testimonies)
	{
		try {
			if (!wot_util.isenabled() || !pref || !target ||
					!testimonies) {
				return;
			}

			var nonce = wot_crypto.nonce();

			var context = wot_arc4.create(wot_hash.hmac_sha1hex(
								wot_prefs.witness_key, nonce));

			if (!context) {
				return;
			}

			var crypted = wot_arc4.crypt(context,
								wot_hash.strtobin(target));

			if (!crypted) {
				return;
			}

			var qs = WOT_SERVICE_API_SUBMIT +
				"?id="		+ wot_prefs.witness_id +
				"&nonce="	+ nonce +
				"&target="	+ encodeURIComponent(btoa(
									wot_hash.bintostr(crypted)));

			var found = 0;

			for (var i = 0; i < WOT_APPLICATIONS; ++i) {
				if (testimonies[i] >= 0) {
					qs += "&testimony_" + i + "=" + testimonies[i];
					++found;
				}
			}

			if (!found) {
				return;
			}

			qs += wot_url.getapiparams();
			   
			var request = new XMLHttpRequest();

			if (!request) {
				return;
			}

			request.open("GET", wot_core.wot_service_url() +
					wot_crypto.authenticate_query(qs));

			new wot_cookie_remover(request);

			request.onload = function(event)
			{
				try {
					if (request.status == 200) {
						var submit = request.responseXML.getElementsByTagName(
										WOT_SERVICE_XML_SUBMIT);

						if (submit && submit.length > 0) {
							wot_pending.clear(pref);
						}
					}
				} catch (e) {
					dump("wot_api_submit.onload: failed with " + e + "\n");
				}
			};

			request.send(null);
		} catch (e) {
			dump("wot_api_submit.send: failed with " + e + "\n");
		}
	}
};

var wot_api_feedback =
{
	send: function(url, question, choice)
	{
		try {
			if (!wot_util.isenabled() || !url || !choice || !question) {
//				dump("wot_api_feedback.send() - invalid params were given\n");
				return;
			}

			var nonce = wot_crypto.nonce();

			var context = wot_arc4.create(wot_hash.hmac_sha1hex(
				wot_prefs.witness_key, nonce));

			if (!context) {
//				dump("wot_api_feedback.send() - no context was given\n");
				return;
			}

			var crypted = wot_arc4.crypt(context,
				wot_hash.strtobin(url));

			if (!crypted) {
//				dump("wot_api_feedback.send() - url encryption failed\n");
				return;
			}

			var qs = WOT_SERVICE_API_FEEDBACK +
				"?question=" + String(question) +
				"&choice=" + String(choice) +
				"&url=" + encodeURIComponent(btoa(wot_hash.bintostr(crypted))) +
				"&id="		+ wot_prefs.witness_id +
				"&nonce="	+ nonce;

			qs += wot_url.getapiparams();

			var request = new XMLHttpRequest();

			if (!request) {
//				dump("wot_api_feedback.send() - failed to create Request object\n");
				return;
			}

			request.open("GET", wot_core.wot_service_url() + wot_crypto.authenticate_query(qs));

			new wot_cookie_remover(request);

			request.onload = function(event)
			{
				try {
					if (request.status == 200) {
//						dump("wot_api_feedback.onload: answer submitted successfully\n");
					}
				} catch (e) {
					dump("wot_api_feedback.onload: failed with " + e + "\n");
				}
			};

			request.send(null);
//			dump("wot_api_feedback.send() feedback was sent\n");

		} catch (e) {
			dump("wot_api_feedback.send: failed with " + e + "\n");
		}
	}
};

var wot_api_update =
{
	send: function(force)
	{
		try {
			var interval = wot_prefs.update_interval;

			if (interval < WOT_MIN_INTERVAL_UPDATE_CHECK) {
				interval = WOT_MIN_INTERVAL_UPDATE_CHECK;
			} else if (interval > WOT_MAX_INTERVAL_UPDATE_CHECK) {
				interval = WOT_MAX_INTERVAL_UPDATE_CHECK;
			}

			var last = Date.now() - interval;

			if (!force && WOT_VERSION == wot_prefs.last_version &&
					last < Number(wot_prefs.update_checked)) {
				return;
			}

			/* Increase the last check time a notch */
			var next = last + WOT_INTERVAL_UPDATE_ERROR;

			if (!wot_prefs.setChar("last_version", WOT_VERSION) ||
					!wot_prefs.setChar("update_checked", next)) {
				return;
			}

			wot_prefs.flush();
			
			/* Build a request */
			var request = new XMLHttpRequest();

			request.open("GET", wot_core.wot_service_url() +
				WOT_SERVICE_API_UPDATE +
				"?id="		+ wot_prefs.witness_id +
				"&nonce="	+ wot_crypto.nonce() +
				"&format="	+ WOT_SERVICE_UPDATE_FORMAT +
				wot_url.getapiparams());

			new wot_cookie_remover(request);

			request.onload = this.onload;
			request.send(null);
		} catch (e) {
			dump("wot_api_update.send: failed with " + e + "\n");
		}
	},

	onload: function(event)
	{
		try {
			if (!event) {
				return;
			}

			var request = event.target;
			if (!request || request.status != 200) return;

			var response = request.responseXML;
			if (!response) return;

			/* Update the the last check time */
			wot_prefs.setChar("update_checked", Date.now());

			var update = null;
			var tags = response.getElementsByTagName(WOT_PLATFORM);

			if (tags) {
				update = tags.item(0);
			}

			if (!update) return;

			/* Attributes */
			var interval = update.getAttribute(WOT_SERVICE_XML_UPDATE_INTERVAL);

			if (interval && Number(interval) > 0) {
				wot_prefs.setInt("update_interval", interval * 1000);
			}

            /* Categories */
            var cats = response.getElementsByTagName(WOT_SERVICE_XML_UPDATE_CATEGORIES);
            if (cats && cats[0]) wot_categories.parse(cats[0]);

			/* Search rules */
			var search = response.getElementsByTagName(WOT_SERVICE_XML_UPDATE_SEARCH);
			if (search) wot_search.parse(search);

			/* Shared domains */
			var shared = response.getElementsByTagName(WOT_SERVICE_XML_UPDATE_SHARED);
			if (shared) wot_shared.parse(shared);


			wot_prefs.flush();
		} catch (e) {
			dump("wot_api_update.onload: failed with " + e + "\n");
		}
	}
};

var wot_pending =
{
	store: function(name) /* host */
	{
		try {
			if (!wot_cache.iscached(name) ||
					!wot_cache.get(name, "pending")) {
				return false;
			}

			var data = wot_idn.utftoidn(name);

			if (!data) {
				return false;
			}

			for (var i = 0; i < WOT_APPLICATIONS; ++i) {
				data += " " + wot_cache.get(name, "testimony_" + i);
			}

			var pref = Date.now();

			if (wot_prefs.setChar("pending." + pref, data)) {
				return true;
			}

			wot_prefs.flush();
		} catch (e) {
			dump("wot_pending.store: failed with " + e + "\n");
		}

		return false;
	},

	clear: function(pref)
	{
		try {
			if (!pref || !pref.length) {
				return;
			}

			var base = "pending." + pref;

			if (!wot_prefs.getChar(base, null)) {
				return;
			}

			wot_prefs.clear(base);
			wot_prefs.clear(base + ".submit");
			wot_prefs.clear(base + ".tries");
			wot_prefs.deleteBranch(base);
			wot_prefs.flush();
		} catch (e) {
			dump("wot_pending.clear: failed with " + e + "\n");
		}
	},

	parse: function(pref, data)
	{
		try {
			var m = /^([^\s]+)(.*)/.exec(data);

			if (!m || !m[1] || !m[2]) {
				dump("wot_pending.parse: invalid entry: " + pref + ": " +
					data + "\n");
				this.clear(pref);
				return null;
			}

			var rv = {
				target: m[1],
				testimonies: []
			};
			var values = m[2];

			for (var i = 0; i < WOT_APPLICATIONS; ++i) {
				m = /^\s*(-?\d+)(.*)/.exec(values);

				if (!m || m[1] == null || Number(m[1]) < 0) {
					rv.testimonies[i] = -1;
				} else {
					rv.testimonies[i] = Number(m[1]);

					if (rv.testimonies[i] > WOT_MAX_REPUTATION) {
						rv.testimonies[i] = WOT_MAX_REPUTATION;
					}
				}

				values = m[2];
			}

			dump("wot_pending.parse: " + pref + ": " + rv.target + "\n");
			return rv;
		} catch (e) {
			dump("wot_pending.parse: failed with " + e + "\n");
		}

		return null;
	},

	submit: function()
	{
		try {
			var branch = wot_prefs.ps.getBranch(WOT_PREF + "pending.");
			var children = branch.getChildList("", {});

			for (var i = 0; i < children.length; ++i) {
				var pref = children[i];

				if (!/^\d+$/.test(pref)) {
					continue;
				}

				var base = "pending." + pref;
				var data = wot_prefs.getChar(base, null);

				if (!data) {
					continue;
				}

				var submit = wot_prefs.getChar(base + ".submit", null);

				if (submit) {
					submit = Date.now() - Number(submit);
					if (submit < WOT_INTERVAL_SUBMIT_ERROR) {
						continue;
					}
				}

				var tries = wot_prefs.getChar(base + ".tries", null);

				if (tries) {
					tries = Number(tries);
					if (tries >= WOT_MAX_TRIES_SUBMIT) {
						this.clear(pref);
						continue;
					}
				} else {
					tries = 0;
				}

				if (!wot_prefs.setChar(base + ".submit", Date.now()) ||
						!wot_prefs.setChar(base + ".tries", tries + 1)) {
					continue;
				}

				var parsed = this.parse(pref, data);

				if (!parsed) {
					continue;
				}

				wot_api_submit.send(pref, parsed.target, parsed.testimonies);

				if (!wot_cache.iscached(parsed.target) ||
						wot_cache.get(parsed.target, "pending")) {
					continue;
				}

				for (var i = 0; i < WOT_APPLICATIONS; ++i) {
					if (parsed.testimonies[i] < 0) {
						continue;
					}

					wot_cache.set(parsed.target, "testimony_" + i,
						parsed.testimonies[i]);
				}
			}
		} catch (e) {
			dump("wot_pending.submit: failed with " + e + "\n");
		}
	}
};
