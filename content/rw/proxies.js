/*
 proxies.js
 Copyright © 2009 - 2013  WOT Services Oy <info@mywot.com>

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

// The purpose of this file is to handle objects and methods that exist in Chrome browser but doesn't in Firefox

var wot_bg = {    // background page object

    wot: {
        prefs: { // preferences

            _prefs: {},

            get: function (k) {
                return wot_bg.wot.prefs._prefs[k];
            },

            set: function (k, v) {
                var _this = wot_bg.wot;
                // TODO: implement pushing setting preferences to the BG
                wot_bg.wot.prefs._prefs[k] = v;
                _this.core.moz_send("prefs:set", {key: k, value: v});
            },

            load_prefs: function (json_data) {
                wot_bg.wot.prefs._prefs = JSON.parse(json_data);
            }
        },

        core: { // stubs of Background page

            _level: "", // TODO: implement getting current user "level",
            _moz_element_id: null,
            _moz_event_id: null,

            usermessage: {},

            is_level: function (level) {
                return wot_bg.wot.core._level == level;
            },

            update: function (update_rw) {
                wot_bg.wot.core.moz_send("update", { update_rw: update_rw});  // ask BG to update rating window
            },

            update_ratingwindow_comment: function () {
                wot_bg.wot.core.moz_send("update_ratingwindow_comment", null);  // ask BG to update comment data
            },

            unseenmessage: function () {
                wot_bg.wot.core.moz_send("unseenmessage", null);
            },

            moz_set_usermessage: function (json_data) {
                // Takes jsoned message to show it user in RW

                var data = JSON.parse(json_data);
                if (data && data.text) wot_bg.wot.core.usermessage = data;
            },

            moz_connect: function (element_id, event_id) {
                // init communication channel's properties
                wot_bg.wot.core._moz_element_id = element_id;
                wot_bg.wot.core._moz_event_id = event_id;
            },

            moz_send: function (message_id, data) {
                // Sends event with data to background code (outside of RatingWindow)
                var obj = document.getElementById(wot_bg.wot.core._moz_element_id);
                var e = new CustomEvent(wot_bg.wot.core._moz_event_id, {
                    "detail": {
                        "message_id": message_id,
                        "data": data
                    }
                });
                obj.dispatchEvent(e);
            }
        },

        keeper: {
            remove_comment: function (target) {
                // TODO: implement
            },

            save_comment: function (target, user_comment, user_comment_id, votes, keeper_status) {

            }
        },

        url: {
            decodehostname: function (v) { return v;}   // no need to process data in RW since it is already process in BG
        },

        api: {

            submit: function () {

            },

            comments: {

                get: function (target) {

                },

                submit: function (target, user_comment, user_comment_id, votes) {

                },

                remove: function (target) {

                }

            }

        },

        ga: {}  // this object is replaced on every chrome.extension.getBackgroundPage() call
    },

    console: {

        log: function(args) {
            if (window.console && window.console.log) {
                window.console.log("LOG: " + arguments[1] + " , " + arguments[2] + " , " + arguments[3]);
            }
        },
        warn: function (args) {
            if (window.console && window.console.log) {
                window.console.log("WARN: " + arguments[1] + " , " + arguments[2] + " , " + arguments[3]);
            }
        },
        error: function (args) {
            if (window.console && window.console.log) {
                window.console.log("ERROR: " + arguments[1] + " , " + arguments[2] + " , " + arguments[3]);
            }
        }
    }

};

// IN order to allow RatingWindow to close itself we redefine the global method (what a nasty life!).
window.close = function() {
    wot_bg.wot.core.moz_send("close", null);
};

var chrome = {
    extension: {
        getBackgroundPage: function () {
            if (wot.ga) {
                wot_bg.wot.ga = wot.ga; // init/update the GA object
            }
            return wot_bg;
        }
    },

    i18n: {

        messages: {},

        getMessage: function(c) {
            return chrome.i18n.messages[c];
        },

        loadMessages: function (json_data) {
            chrome.i18n.messages = JSON.parse(json_data);
        }

    }
};

