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

    /* Called when the popup window is hidden */
    hide_popup: function()
    {
        try {
            if (wot_api_query.message_id.length > 0 &&
                wot_api_query.message_id !=
                    WOT_SERVICE_XML_QUERY_MSG_ID_MAINT) {
                wot_prefs.setChar("last_message", wot_api_query.message_id);
            }

            /* Stores any pending testimonies */
            wot_core.update();
        } catch (e) {
            dump("wot_events.hide_popup: failed with " + e + "\n");
        }
    },

    on_rw_open: function (event) {

        var rw = this.get_rw_window(),
            rw_doc = this.get_rw_document(),
            rw_wot = this.get_rw_wot();

        if (!rw || !rw_doc || !rw_wot) return;

        if (!this.is_inited) {
            this.initialize(rw, rw_doc, rw_wot);
        }

        rw_doc.getElementById("ratings-area").addEventListener("click", function(event){
            wdump("RW area clicked");
        }, false);

    },

    initialize: function (rw, rw_doc, rw_wot) {

        var locale_strings = wot_util.get_all_strings();
        rw.chrome.i18n.loadMessages(JSON.stringify(locale_strings));    // using JSON to push data to sandboxed content

        rw_wot.ratingwindow.localize();

        this.is_inited = true;
    }

};

wot_modules.push({ name: "wot_rw", obj: wot_rw });