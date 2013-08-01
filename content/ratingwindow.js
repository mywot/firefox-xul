/*
 ratingwindow.js
 Copyright © 2013  WOT Services Oy <info@mywot.com>

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

var wot_rw = {

    RW_URL: "chrome://wot/content/rw/ratingwindow.html",
    FRAME_ID: "wot-rwframe",
    is_inited: false,
    CHAN_ELEM_ID: "wot-comm-channel",
    CHAN_EVENT_ID: "wotrw",

    get_rw_window: function () {
        var rw_frame = document.getElementById(this.FRAME_ID);
        return rw_frame ? rw_frame.contentWindow : null;
    },

    get_rw_document: function () {
        var rw_frame = document.getElementById(this.FRAME_ID);
        return rw_frame ? rw_frame.contentDocument : null;
    },

    get_rw_wot: function () {
        var rw = this.get_rw_window();
        return rw ? rw.wot : null;
    },

    unseenmessage: function () {
        try {
            if (wot_api_query.message_id.length > 0 &&
                wot_api_query.message_id !=
                    WOT_SERVICE_XML_QUERY_MSG_ID_MAINT) {
                wot_prefs.setChar("last_message", wot_api_query.message_id);
            }
        } catch (e) {
            wdump("wot_rw.unseenmessage: failed with " + e);
        }
    },

    hide_ratingwindow: function () {
        var popup = document.getElementById("wot-popup");
        if (popup) {
            popup.hidePopup();
        }
    },

    /* Called when the popup window is hidden */
    on_hide_popup: function()
    {
        try {
            wot_rw.unseenmessage();

            /* Stores any pending testimonies */
            wot_core.update();
        } catch (e) {
            wdump("wot_rw.hide_popup: failed with " + e);
        }
    },

    on_rw_open: function (event) {

        var rw = this.get_rw_window(),
            rw_doc = this.get_rw_document(),
            rw_wot = this.get_rw_wot();

        if (!rw || !rw_doc || !rw_wot) return;

        if (!this.is_inited) {
            this.initialize(rw, rw_doc, rw_wot);
            // RW will ask BG to update it, so no need to update it here
        } else {
            wot_rw.update(); // RW is already loaded so we need to just update it
        }
    },

    update: function () {
        // Updates content of Rating Window. RW must be already initialized (locales, categories info, etc).
        wdump("RW.update()");

        var rw = this.get_rw_window(),
            rw_doc = this.get_rw_document(),
            rw_wot = this.get_rw_wot(),
            data = {},
            target = wot_core.hostname;

        wdump("Target: " + target);

        if (!rw || !rw_doc || !rw_wot) return;

        if (target && wot_cache.isok(target)) {
            var normalized_target = wot_cache.get(target, "normalized") || target;

            // prepare data for the RW
            data = {
                target: target,
                normalized: wot_shared.decodehostname(normalized_target),
                updated: wot_cache.get(target, "time"),
                cached: {
                    status: wot_cache.get(target, "status"),
                    value: {}
                }
            };

            // fill it with reputation data
            for (var i = 0; i < WOT_COMPONENTS.length; i++) {
                var app = WOT_COMPONENTS[i];
                var rep = wot_cache.get(target, "reputation_" + app),
                    cnf = wot_cache.get(target, "confidence_" + app),
                    exl = wot_cache.get(target, "excluded_" + app),
                    t = wot_cache.get(target, "testimony_" + app);

                if (!data.cached.value[app]) {
                    data.cached.value[app] = {};
                }

                data.cached.value[app].r = exl ? -2 : rep;
                data.cached.value[app].c = exl ? 0 : cnf;
                data.cached.value[app].t = t;
            }

            data.cached.value.cats = wot_categories.target_categories(target);
            data.cached.value.blacklist = wot_categories.target_blacklists(target);

        } else {
            data = {
                target: target,
                normalized: target,
                updated: null,
                cached: {
                    status: WOT_QUERY_ERROR,
                    value: {}
                }
            };
        }

        wdump("data: " + JSON.stringify(data));

        rw_wot.ratingwindow.update(target, JSON.stringify(data));
    },

    get_preferences: function () {

        var prefs = {
            accessible:         wot_prefs.accessible,
            show_fulllist:      wot_prefs.show_fulllist,
            ratingwindow_shown: wot_prefs.ratingwindow_shown,
            activity_score:     wot_prefs.activity_score
        };

        return prefs;
    },

    push_preferences: function (rw, prefs) {
        rw.wot_bg.wot.prefs.load_prefs(JSON.stringify(prefs));
    },

    on_ratingwindow_event: function (event) {
        var details = event.detail;
        if (!details) return false;

        wdump("on_ratingwindow_event() " + JSON.stringify(details));

        var message_id = details.message_id,
            data = details.data;

        // Important: don't use "this" here, because it points to other than wot_rw object!

        switch (message_id) {
            case "update":  // bg.wot.core.update() is called from RW
                if (data && data.update_rw) {
                    wot_rw.update();
                }
                // TODO: do other updates (e.g. toolbar icon, etc)
                wot_commands.update();  // Update button's context menu
                break;

            case "update_ratingwindow_comment":
                // TODO: implement
                break;

            case "unseenmessage":
                wot_rw.unseenmessage();
                break;

            case "navigate":
                wot_browser.open_wotsite(data.url, "", "", data.context, true, true);
                wot_rw.hide_ratingwindow();
                break;
        }
    },

    init_channel: function (elem_id, event_id) {
        var doc = this.get_rw_document(),
            rw = this.get_rw_window();

        if (!doc || !rw) return false;

        rw.wot_bg.wot.core.moz_connect(elem_id, event_id);

        var chan = doc.getElementById(elem_id);
        if (chan) {
            chan.addEventListener(event_id, this.on_ratingwindow_event);
        } else {
            wdump("Can't find 'wot-comm-channel' element in RatingWindow DOM. Very bad!");
        }

        return true;
    },

    initialize: function (rw, rw_doc, rw_wot) {

        this.init_channel(this.CHAN_ELEM_ID, this.CHAN_EVENT_ID);

        var locale_strings = wot_util.get_all_strings();
        rw.chrome.i18n.loadMessages(JSON.stringify(locale_strings));    // using JSON to push data to sandboxed content

        // TODO: provide preferences to RW
        wdump(JSON.stringify(this.get_preferences()));

        var prefs = this.get_preferences();
        this.push_preferences(rw, prefs);

        // setup categories data in the RW
        rw_wot.categories = wot_categories.categories;
        rw_wot.grouping = wot_categories.grouping;
        rw_wot.cgroups = wot_categories.cgroups;

        // TODO: provide "level" (decrypted) value

        rw_wot.ratingwindow.onload();   // this runs only once in FF

        this.is_inited = true;
    }

};

wot_modules.push({ name: "wot_rw", obj: wot_rw });