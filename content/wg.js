/*
	wg.js
	Copyright © 2014 -  WOT Services Oy <info@mywot.com>

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

var wot_wg = {
	/* WOT Groups core functionality */

	mytags: [ ],
	mytags_updated: null,       // time when the list was updated last time
	MYTAGS_UPD_INTERVAL: 30 * 60 * 1000,

	popular_tags: [ ],
	popular_tags_updated: null,
	POPULARTAGS_UPD_INTERVAL: 30 * 60 * 1000,

	tags_re: /(\s|^)#([a-zä-ö0-9\u0400-\u04FF]{2,})/img,    // Also change the regexp at content/rw/wot.js
	tags_validate_re: /^\d{2}$/im,

	is_enabled: function () {
		return (wot_hashtable.get("wg_enabled") == true);
	},

	enable: function (is_enabled) {
		wot_hashtable.set("wg_enabled", is_enabled);
	},

	get_mytags_updated: function () {
		return wot_hashtable.get("mytags_updated") || null;
	},

	get_popular_tags_updated: function () {
		return wot_hashtable.get("popular_tags_updated") || null;
	},

	get_mytags: function () {
		var json = wot_hashtable.get("mytags_list") || "[]";
		return JSON.parse(json);
	},

	get_popular_tags: function () {
		var json = wot_hashtable.get("popular_tags_list") || "[]";
		return JSON.parse(json);
	},

	set_mytags: function (tags) {
		// this function is called in dynamic way, e.g. by concatenating string "set_" + variable.
		tags = tags || [];
		wot_hashtable.set("mytags_list", JSON.stringify(tags));
		wot_hashtable.set("mytags_updated", Date.now());
	},

	set_popular_tags: function (tags) {
		tags = tags || [];
		wot_hashtable.set("popular_tags_list", JSON.stringify(tags));
		wot_hashtable.set("popular_tags_updated", Date.now());
	},

	update_tags: function () {
		// Checks whether particular tag list is expired or haven't been updated yet, and fetches the list

		var tmap = [
			{
				keyword: "mytags",
				method: "getmytags",
				time_func: wot_wg.get_mytags_updated,
				time: wot_wg.MYTAGS_UPD_INTERVAL
			}, {
				keyword: "popular_tags",
				method: "getmastertags",
				time_func: wot_wg.get_popular_tags_updated,
				time: wot_wg.POPULARTAGS_UPD_INTERVAL
			}
		];

		for (var i = 0; i < tmap.length; i++) {
			var obj = tmap[i];
			var last_updated = obj.time_func.apply();
			if (!last_updated || obj.time + last_updated < Date.now()) {
				wot_api_tags.get_tags(obj.keyword, obj.method);
			}
		}
	},

	append_mytags: function (mytags) {
		if (mytags instanceof Array && mytags.length) {

			var _this = this,
				mytags_flat = _this.get_mytags().map(function (item) { return item.value });

			var uniq = mytags.filter(function (tag) {
				var tag_value = tag.value.trim();
				return mytags_flat.indexOf(tag_value) < 0;
			});

			var uniq_tags = uniq.map(function (tag) {
				tag.mytag = true;
				return tag;
			});

			this.set_mytags(_this.mytags.concat(uniq_tags));
		}
	},

	extract_tags: function (text) {

		if (!text) return [];

		var res,
			tags = [],
			_tags = {};

		while ((res = this.tags_re.exec(text)) !== null) {
			var tag = res[2] || "";
			if (this.tags_validate_re.test(tag)) continue;  // skip invalid tag
			if (tag && !_tags[tag]) {
				tags.push({
					value: tag       // tag's text
				});
				_tags[tag] = true;  // remember the tag to avoid duplications
			}
		}
		this.tags_re.lastIndex = 0; // reset the last index to avoid using it for the different text
		return tags;
	}
};

wot_modules.push({ name: "wot_wg", obj: wot_wg });
