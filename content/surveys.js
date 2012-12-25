/*
 surveys.js
 Copyright © 2012 -   WOT Services Oy <info@mywot.com>

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

var wot_surveys = {

	fbl_form_schema:    "//",
	storage_file:       "storage.json",
	fbl_form_uri:       "fbl.local/feedback/1/surveys.html",
	re_fbl_uri:         null,
	wrapper_id:         "wot_surveys_wrapper",
	is_shown:           false,
	wrapper:            null,
	pheight:            350,
	pwidth:             392,
	px:                 10,
	py:                 10,
	script_base:        "resource://wot-base-dir/injections/",
	scripts:            [ "jquery.js", "jquery-ui-1.9.2.custom.js",
						  "wot_proxy.js", "ga_configure.js",
						 "surveys.widgets.js", "ga_init.js"],

	asked: {},
	asked_loaded: false,
	last_time_asked: null,

	calm_period:        1 * 24 * 3600, // Time in seconds after asking a question before we can ask next question
	always_ask:         ['api.mywot.com', 'fb.mywot.com'],
	always_ask_passwd:  "#surveymewot", // this string must be present to show survey by force
	reset_passwd:       "#wotresetsurveysettings", // this string must be present to reset timers and optout

	FLAGS: {
		none:       0,  // a user didn't make any input yet
		submited:   1,  // a user has given the answer
		closed:     2,  // a user has closed the survey dialog without givin the answer
		optedout:   3   // a user has clicked "Hide forever"
	},

	survey_url: function()
	{
		return this.fbl_form_schema + this.fbl_form_uri;
	},

	load_delayed: function ()
	{
		this.re_fbl_uri = new RegExp("^" + wot_surveys.fbl_form_uri, "i");  // prepare RegExp once to use often

		try {
			var lasttime = wot_prefs.getChar("feedback_lasttimeasked", null);
			if(lasttime) {
				this.last_time_asked = new Date(lasttime);
			}
		} catch (e) {
			this.last_time_asked = null;
			dump("wot_surveys.load_delayed raised the exeption:" + e + "\n");
		}

		// Load the JSON stored data about asked websites
		wot_file.read_json(wot_surveys.storage_file, function (data, status) {

			if (data && data.asked) {
				wot_surveys.asked = data.asked;
			}

			wot_surveys.asked_loaded = true;    // set this flag anyway to indicate that loading finished
		});
	},

	domcontentloaded: function(event)
	{
		try {

			if (!event || !wot_util.isenabled()) {
				return;
			}

			var content = event.originalTarget,
				location = (content && content.location) ? content.location : {};

			var is_framed = (content.defaultView != content.defaultView.top);

			// Process framed documents differently than normal ones
			if (is_framed) {

				if (location) {
					// skip all frames except of our own FBL form
					if (wot_surveys.re_fbl_uri.test(location.host + location.pathname)) {
						// here we found WOT FBL form loaded into a frame. Next step - to inject JS into it.
						wot_surveys.inject_javascript(content);
					}
				}

			} else {

				// same code as for warning screen
				if (!content || !location || !location.href ||
					wot_url.isprivate(location.href) || !(/^https?:$/.test(location.protocol))) {
					return;
				}

				var hostname = wot_url.gethostname(location.href);
				var warning_type = wot_warning.isdangerous(hostname, false);

				// ask only if no big Warning is going to be shown
				if (warning_type == WOT_WARNING_NONE|| warning_type == WOT_WARNING_NOTIFICATION) {
					wot_surveys.try_show(content, hostname);
				}
			}

		} catch (e) {
			dump("wot_surveys.domcontentloaded: failed with " + e + "\n");
		}

	},

	unload: function (event)
	{
		// TODO: Implement some cleaning here?
	},

	get_or_create_sandbox: function(content)
	{
		var sandbox = content.wotsandbox;

		if (!sandbox) {
			var wnd = new XPCNativeWrapper(content.defaultView);
			sandbox = new Components.utils.Sandbox(wnd);

			sandbox.window = wnd;
			sandbox.document = sandbox.window.document;
			sandbox.__proto__ = sandbox.window;

			sandbox.wot_post = wot_search.getsandboxfunc(sandbox, "wot_post", wot_surveys.sandboxapi);

			content.wotsandbox = sandbox;
		}

		return sandbox;
	},

	load_file: function(file)
	{
		var str = "";

		try {
			var ioService = Components.classes["@mozilla.org/network/io-service;1"]
				.getService(Components.interfaces.nsIIOService);
			var scriptableStream = Components
				.classes["@mozilla.org/scriptableinputstream;1"]
				.getService(Components.interfaces.nsIScriptableInputStream);

			var channel = ioService.newChannel(file, null, null);
			var input = channel.open();
			scriptableStream.init(input);
			str = scriptableStream.read(input.available());
			scriptableStream.close();
			input.close();
		} catch (e) {
			dump("wot_surveys.load_file(): failed with " + e + "\n");
		}

		return str;
	},

	inject_javascript: function (content)
	{
		dump("Going to inject JS into FBL form\n");
		var sandbox = wot_surveys.get_or_create_sandbox(content);

		var contents = "",
			url = "";

		// load all scripts and join to one text
		for(var i=0; i < wot_surveys.scripts.length; i++) {
			url = wot_surveys.script_base + wot_surveys.scripts[i];
			contents = wot_surveys.load_file(url);

			// run scripts in fbl form-page
			try {
				Components.utils.evalInSandbox(contents, sandbox);
			} catch (e) {
				dump("wot_surveys.load_script(): evalInSandbox " +
					"failed with " + e + "\n");
			}
		}

	},

	inject: function (doc, question)
	{
		var ws = wot_surveys;
		var location = doc.defaultView.location;

		// skip params and hash in the URL
		question.url = location.protocol + "//" + location.host + location.pathname;

		var wrapper = doc.getElementById(ws.wrapper_id);
		if(wrapper) {
			return;
		}
		wrapper = doc.createElement("iframe");
		wrapper.setAttribute("id", ws.wrapper_id);

		if (!wrapper) {
			dump("can't add element to DOM / wot.surveys.inject_placeholder()");
			return;
		}

		ws.wrapper = wrapper;  // keep the link to the element to destroy it

		wrapper.setAttribute("scrolling", "no");

		wrapper.setAttribute("style",
			"position: fixed; " +
				"top: " + ws.py + "px; " +
				"left: "+ ws.px +"px;" +
				"width: "+ ws.pwidth +"px; " +
				"height: "+ ws.pheight +"px; " +
				"z-index: 2147483647; " +
				"border: none; visibility: hidden;");

		wrapper.setAttribute("src", this.survey_url());

		var encoded_data = btoa(JSON.stringify(question));

		// Probably in FF we should transfer data to the frame by injecting it as JS (json) object instead of
		// relying to "name" property
		wrapper.setAttribute("name", encoded_data);  // transfer question's data via "name" property of iframe

		wot_browser.attach_element(wrapper, doc.defaultView); // attach iframe wrapper to DOM
	},

	try_show: function (doc, hostname)
	{
		try {
			var url = doc.defaultView.location.href;

			// test url for RESET command
			if (wot_surveys.always_ask.indexOf(hostname) >= 0 && url && url.indexOf(wot_surveys.reset_passwd) >= 0) {
				wot_surveys.reset_settings(hostname);
				return;
			}

			var question = wot_surveys.get_question(hostname);

			if (this.is_tts(hostname, url, question.question)) {
				this.inject(doc, question);
			}

		} catch (e) {
			dump("wot_surveys.try_show() failed with " + e + "\n");
		}
	},

	reset_settings: function (hostname)
	{
		var ws = wot_surveys;
		ws.asked_loaded = true;
		ws.last_time_asked =null;
		ws.asked = {};      // reset the list of websites asked about
		ws.opt_out(false);  // reset opt-out
		wot_prefs.setChar("feedback_lasttimeasked", ""); // reset time
		ws.remember_asked(hostname, 0, ws.FLAGS.none);
	},

	remove_form: function (sandbox, timeout)
	{
		try {

			timeout = timeout || 100;

			window.setTimeout(function () {
				var wrapper = wot_surveys.get_wrapper(sandbox);
				if (wrapper) {
					wrapper.parentNode.removeChild(wrapper);
				}
			}, timeout);

		} catch (e) {
			dump("wot_surveys.remove_form() failed with " + e + "\n");
		}
	},

	get_question: function (hostname)
	{
		try {
			var question_id = wot_cache.get(hostname, "question_id");
			var question_text = wot_cache.get(hostname, "question_text");
			var choices_number = wot_cache.get(hostname, "choices_number");

			dump("SHOW: id, text : " + String(question_id) + " , " + String(question_text) + "\n");

			if (choices_number > 0) {
				var question = {
					target: hostname,
					decodedtarget: wot_idn.idntoutf(hostname),
					question: {
						id: question_id,
						text: question_text,
						choices: []
					}
				};

				for(var i= 0, v, t; i < choices_number; i++) {
					v = wot_cache.get(hostname, "choice_value_" + i);
					t = wot_cache.get(hostname, "choice_text_" + i);
					question.question.choices.push({ value: v, text: t });
				}

				return question;

			} else {
				return {};
			}

		} catch (e) {
			return {};
		}

	},

	is_tts: function (hostname, url, question)
	{
		var ws = wot_surveys;

		dump("IS_TTS? " + JSON.stringify(question) + "\n");

		try {
			if(!wot_surveys.asked_loaded) return false; // data isn't ready for process
			dump("if(!wot_surveys.asked_loaded) passed.\n");

			if(!(question && question.id !== undefined && question.text && question.choices)) {
				// no question was given for the current website - do nothing
				return false;
			}
			dump("is_tts: question test passed.\n");

			// on special domains we should always show the survey if there is a special password given (for testing purposes)
			// e.g. try this url http://api.mywot.com/test.html#surveymewot
			if (ws.always_ask.indexOf(hostname) >= 0 && url && url.indexOf(ws.always_ask_passwd) >= 0) {
				return true;
			}
			dump("is_tts: always ask test not passed.\n");

			if (ws.is_optedout() || !wot_prefs.getBool("feedback_enabled", true)) {
				return false;
			}
			dump("is_tts: opt-out and feedback_enabled test passed.\n");

			// check if have asked the user more than X days ago or never before
			if (ws.last_time_asked && wot_util.time_since(ws.last_time_asked) < ws.calm_period) {
				return false;
			}
			dump("is_tts: last-time test passed.\n");

			// check whether we already have asked the user about current website
			if (ws.asked[hostname] && ws.asked[hostname][question.id]) {
				// here we could test also if user just closed the survey last time without providing any info
				// (in case if we want to be more annoying)
				return false;
			}
			dump("is_tts: already asked test passed -> show it!\n");

			return true;
		} catch (e) {
			dump("wot_surveys.is_tts() failed with " + e + "\n");
			return false;
		}

	},

	is_optedout: function()
	{
		return wot_prefs.getBool("feedback_optedout", false);
	},

	opt_out: function(value)
	{
		value = (value === undefined) ? true : value;
		wot_prefs.setBool("feedback_optedout", value);
	},

	remember_asked: function(target, question_id, status) {
		var ws = wot_surveys;

		try {

			status = status === undefined ? ws.FLAGS.none : status;

			var asked_data = {
				time: new Date(),   // time of first show the survey
				status: status
			};

			if (ws.asked[target]) {
				if (ws.asked[target][question_id]) {
					asked_data = ws.asked[target][question_id];
					asked_data.status = status;    // just update the status
				} else {
					ws.asked[target][question_id] = {};
				}

			} else {
				ws.asked[target] = {};
				ws.asked[target][question_id] = {};
			}

			ws.asked[target][question_id] = asked_data;    // keep in runtime variable

			var storage = {
				asked: wot_surveys.asked
			};
			wot_file.save_json(wot_surveys.storage_file, storage); // and dump to file

		} catch (e) {
			console.error("remember_asked() failed with", e);
		}
	},

	save_asked_status: function (data, status) {
		var ws = wot_surveys;
		try {
			if (data && data.target && data.question_id) {
				ws.remember_asked(data.target, data.question_id, status);

				// we remember the last time of user's interaction with FBL
				ws.last_time_asked = new Date();
				wot_prefs.setChar("feedback_lasttimeasked", ws.last_time_asked);
			}
		} catch (e) {
			console.error(e);
		}
	},

	get_top_content: function (sandbox)
	{
		var top = null;
		if(sandbox && sandbox.window && sandbox.window.top) {
			top = sandbox.window.top;  // look into top content window document
		}
		return top;
	},

	get_wrapper: function (sandbox)
	{
		var wrapper = null;

		try {
			var top = wot_surveys.get_top_content(sandbox);
			if(top && top.document) {
				wrapper = top.document.getElementById(wot_surveys.wrapper_id);
				if(!wrapper) {
					dump("wot_surveys.get_wrapper(): can't find FBL wrapper in the document\n");
				}
			}
		} catch (e) {
			dump("wot_surveys.get_wrapper() failed with " + e + "\n");
		}

		return wrapper;
	},

	reveal_form: function (sandbox)
	{
		var wrapper = wot_surveys.get_wrapper(sandbox);

		if (wrapper) {
			var style = wrapper.getAttribute("style") || "";
			if (style) {
				style = style.replace(/^(.*visibility: )(hidden;)(.*)$/, "$1visible;$3");   // replace hidden -> visible
				wrapper.setAttribute("style", style);
			}
		}
	},

	dispatch: function (message, data, sandbox)
	{
		switch(message) {
			case "shown": // FBL was shown
				wot_surveys.reveal_form(sandbox);   // make iframe visible
				wot_surveys.save_asked_status(data, wot_surveys.FLAGS.none);
				break;
			case "close": // FBL is asking to close it
				// data.target
				wot_surveys.save_asked_status(data, wot_surveys.FLAGS.closed);
				wot_surveys.remove_form(sandbox);
				break;
			case "optout": // FBL says the user wants to opt-out from the feedback loop.
				// data.target
				wot_surveys.opt_out();  // store setting
				wot_surveys.save_asked_status(data, wot_surveys.FLAGS.optedout);
				wot_surveys.remove_form(sandbox);
				break;
			case "submit":
				//	data.target, .url, .question_id, .answer
				wot_api_feedback.send(data.url, data.question_id, data.answer);
				wot_surveys.save_asked_status(data, wot_surveys.FLAGS.submited);
				wot_surveys.remove_form(sandbox, 1500); // wait a bit to show "thank you!"
				break;
		}
	},

	// This is a wrapper around functions that might be called from the injected JS
	sandboxapi: {

		wot_post: function (sandbox, data_json) {
			// this func is called from /content/injections/wot_proxy.js : wot.post()

			try {
				// try un-json data (DON'T call any methods of data_json since it is unsafe!)
				var data = JSON.parse(data_json);

				dump("wot_surveys.sandpoxapi.wot_post(): " + JSON.stringify(data) + "\n");

				if (data && data.message && data.data) {
					wot_surveys.dispatch(data.message, data.data, sandbox);
				}
			} catch (e) {
				dump("wot_surveys.sandboxapi.wot_post(): failed with " + e + "\n");
			}

		}

	}

};

wot_modules.push({ name: "wot_surveys", obj: wot_surveys });
