// the new UI. see docs/nu-ui.md for how it coexists with the classic one,
// and design-handoff/ for the design this implements.
//
// this is the base layer: list, row, navigation, header (search, filter
// chips, status line) and sorting. selection, swipe, grid, the folder-tree
// sheet, the overflow menu, settings and the image viewer are not here yet
// -- until they are, the `classic` link is what they are for.
//
// house style, same as the rest of web/: plain ES5-ish JS, no build step,
// no framework.

"use strict";

var ebi = document.getElementById.bind(document);

function esc(t) {
	return String(t == null ? "" : t).replace(/[<>&"]/g, function (c) {
		return { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c];
	});
}

// -- strings -----------------------------------------------------------
//
// a shim, deliberately: `Ls` lives in util.js and nu does not load util.js,
// the `tl/{{ lang }}.js` tag has to be guarded on `lang != "eng"` (there is
// no web/tl/eng.js), and the classic UI resolves `Ls[lang]` as a whole
// object with no per-key fallback (browser.js:716). all three belong to one
// owner, and that is spec 0001's first card, which lifts STR wholesale into
// `Ls.eng` and replaces t()'s body. until then every string this UI adds is
// already routed through t(), so that lift is a rename and not a hunt for
// literals. the older strings are not moved here in the same breath -- that
// is 0001's diff to make, not a second one to reconcile.

var STR = {
	tree_h: "Folders",
	tree_gone: "this volume is unreachable",
	ctx_open: "Open",
	ctx_dl: "Download",
	ctx_old: "Open in the classic UI"
};

function t(k) {
	return STR[k] || k;
}

// -- data shape --------------------------------------------------------
//
// `ls0` is embedded in the html by httpcli (the is_js branch), so the first
// paint costs no roundtrip; later navigation refetches with `?ls`. the two
// differ: the `?ls` json drops `name` and `dt` (see tx_ls in httpcli.py),
// the embedded one keeps them. everything reads through nm()/dt().

function isdir(f) {
	return /\/(\?|$)/.test(f.href);
}

function nm(f) {
	if (f.name)
		return f.name.replace(/\/$/, "");

	var h = f.href.split("?")[0].replace(/\/$/, "");
	try { return decodeURIComponent(h); }
	catch (ex) { return h; }
}

function ext_of(f) {
	if (f.ext && f.ext != "---")
		return f.ext.toLowerCase();

	var n = nm(f), i = n.lastIndexOf(".");
	return i > 0 ? n.slice(i + 1).toLowerCase() : "";
}

var MON = "jan feb mar apr may jun jul aug sep oct nov dec".split(" ");

function ts_of(f) {
	return f.ts || 0;
}

// folders only carry a file count on indexed volumes (-e2d), where the
// server fills tags[".files"]; without an index there is nothing to show
function nfiles(f) {
	var t = f.tags && f.tags[".files"];
	return typeof t == "number" ? t : null;
}

// short "12 jun" like the design; falls back to the server's dt string
function dt_short(f) {
	var t = ts_of(f);
	if (!t)
		return f.dt || "";

	var d = new Date(t * 1000);
	return d.getDate() + " " + MON[d.getMonth()];
}

// the wide band's date column carries the year, and it has to be built here
// rather than reformatted on resize: `?ls` strips `dt` (tx_ls in httpcli.py),
// so after the first navigation `ts` is the only thing left to format from,
// and a row may not be re-rendered when the window changes width.
function dt_long(f) {
	var t = ts_of(f);
	if (!t)
		return f.dt || "";

	var d = new Date(t * 1000);
	return d.getDate() + " " + MON[d.getMonth()] + " " + d.getFullYear();
}

var UNITS = ["B", "KB", "MB", "GB", "TB", "PB"];

function humansize(n) {
	if (!n)
		return n === 0 ? "0 B" : "";

	var i = 0;
	while (n >= 1024 && i < UNITS.length - 1) { n /= 1024; i++; }
	return (i && n < 10 ? n.toFixed(1) : Math.round(n)) + " " + UNITS[i];
}

// -- type chips --------------------------------------------------------

var KIND = {
	vid: "mkv mp4 webm avi mov m4v".split(" "),
	img: "jpg jpeg png gif webp avif bmp".split(" "),
	aud: "mp3 flac opus ogg m4a wav".split(" "),
	doc: "md txt pdf srt 512 log json csv".split(" ")
};

function kind_of(f) {
	if (isdir(f))
		return "dir";

	var e = ext_of(f);
	for (var k in KIND)
		if (KIND[k].indexOf(e) + 1)
			return k;

	return "";
}

// the chip is 42px wide, so a long extension has to give. the design keeps
// the tail, not the head: "checksums.sha512" reads as 512, which is the
// half that identifies the file. css drops to 10px past 3 chars.
function chip_text(f) {
	if (isdir(f))
		return "DIR";

	var e = ext_of(f);
	if (!e)
		return "&#183;";

	return (e.length > 4 ? e.slice(-3) : e).toUpperCase();
}

// -- state -------------------------------------------------------------

var FILTERS = [
	["all", "All", null],
	["dir", "Folders", "dir"],
	["vid", "Video", "vid"],
	["img", "Images", "img"],
	["doc", "Documents", "doc"],
	["aud", "Audio", "aud"]
];

// natural direction per key: name/type ascend, the rest descend
var SORTS = [
	["name", "Name", "A → Z", 1],
	["ts", "Date", "newest first", -1],
	["sz", "Size", "largest first", -1],
	["ext", "Type", "by extension", 1],
	["n", "Items", "folders only", -1]
];

var ST = {
	items: [],
	filter: "all",
	q: "",
	sortKey: "name",
	sortDir: 1,
	sheet: false,
	// the folder tree: `root` is one node (see tree_node), `expanded` is
	// vpath -> bool, the open/closed state. a node's `kids` is the cache,
	// so collapsing and reopening a branch costs no second request.
	tree: { root: null, expanded: {} }
};

// -- mode plumbing -----------------------------------------------------
//
// reachable two ways: the `ui=nu` cookie (sticky) or `?nu` (this request
// only). without the cookie every link out of here must carry `?nu` along
// or the next tap silently lands in the classic UI.

var STICKY = /(^|;\s*)ui=nu(;|$)/.test(document.cookie);

function keep(href) {
	if (STICKY || !href || /^[a-z]+:/i.test(href))
		return href;

	return href + (href.indexOf("?") < 0 ? "?nu" : "&nu");
}

function unpin() {
	// ?setck is an existing server endpoint; see setck() in httpcli.py
	var xhr = new XMLHttpRequest();
	xhr.open("GET", SR + "/?setck=ui=", true);
	xhr.onloadend = function () { location.href = location.pathname; };
	xhr.send();
}

// -- capability and width ----------------------------------------------
//
// width decides layout, capability decides interaction, and they are
// different questions: a 1024px touch tablet and a 1024px desktop window are
// the same layout and emphatically not the same input.
//
// these are read here in JS and not only in CSS because a CSS-only gate
// hides the affordance while leaving the listener attached -- a long-press
// handler installed for a mouse is the bug this exists to prevent.
//
// deliberately NOT util.js's TOUCH ('ontouchstart' in window): that is a
// device fact, true on every hybrid laptop, which is precisely the machine
// this is for. nu never loads util.js anyway.
//
// every query is re-read on change, the way util.js:586-594 re-reads
// prefers-reduced-motion; a capability latched once at boot is wrong on any
// device that changes input mode (a tablet gaining a keyboard, devtools
// emulation, a window dragged to another screen).

var CAP = (function () {
	var defs = {
		coarse: "(pointer: coarse)",
		fine: "(hover: hover) and (pointer: fine)",
		wide: "(min-width: 64em)"
	},
		subs = {},
		r = {
			// CAP.on("coarse", fn) -- fn(matches, name) on every flip
			on: function (name, fn) {
				(subs[name] = subs[name] || []).push(fn);
			}
		};

	function fire(name, val) {
		var cbs = subs[name] || [];
		for (var a = 0; a < cbs.length; a++)
			try { cbs[a](val, name); }
			catch (ex) { }
	}

	for (var k in defs) {
		// false is the safe default everywhere: no matchMedia means no
		// gesture handlers and no wide behavior, never the reverse
		r[k] = false;
		try {
			// the closure has to capture the key -- with no `let`, a bare
			// `k` would read the loop's last value when onchange fires
			(function (name, mq) {
				r[name] = mq.matches;
				mq.onchange = function () {
					r[name] = mq.matches;
					fire(name, mq.matches);
				};
			})(k, window.matchMedia(defs[k]));
		}
		catch (ex) { }
	}

	return r;
})();

// the tree dock sticks below the header, so CSS needs the header's real
// height; --head-h carries an 8.5em fallback until this writes a px value,
// and the header reflows whenever a folder name wraps #nu_nav.
function watch_head() {
	var top = ebi("nu_top");
	if (!top || !window.ResizeObserver)
		return;

	new ResizeObserver(function () {
		try {
			document.documentElement.style.setProperty(
				"--head-h", top.offsetHeight + "px");
		}
		catch (ex) { }
	}).observe(top);
}

// -- sorting and filtering ---------------------------------------------

var dir1st = true;

function cmp_name(a, b) {
	return nm(a).localeCompare(nm(b), undefined, {
		numeric: !!(cfg && cfg.dnsort), sensitivity: "base"
	});
}

function sorted(list) {
	var k = ST.sortKey, d = ST.sortDir;

	return list.slice().sort(function (a, b) {
		// folders first, except when sorting by item count
		if (dir1st && k != "n") {
			var da = isdir(a), db = isdir(b);
			if (da != db)
				return da ? -1 : 1;
		}

		var r = 0;
		if (k == "name")
			r = cmp_name(a, b);
		else if (k == "ts")
			r = ts_of(a) - ts_of(b);
		else if (k == "sz")
			r = (a.sz || 0) - (b.sz || 0);
		else if (k == "ext")
			r = ext_of(a).localeCompare(ext_of(b));
		else if (k == "n")
			r = (nfiles(a) || 0) - (nfiles(b) || 0);

		// always break ties by name, so the order is stable
		return (r * d) || cmp_name(a, b);
	});
}

function filtered() {
	var q = ST.q.toLowerCase(),
		want = null,
		ret = [];

	for (var a = 0; a < FILTERS.length; a++)
		if (FILTERS[a][0] == ST.filter)
			want = FILTERS[a][2];

	for (var a = 0; a < ST.items.length; a++) {
		var f = ST.items[a];

		if (want && kind_of(f) != want)
			continue;

		if (q && nm(f).toLowerCase().indexOf(q) < 0)
			continue;

		ret.push(f);
	}
	return sorted(ret);
}

// -- render ------------------------------------------------------------

function render_chips() {
	var h = [];
	for (var a = 0; a < FILTERS.length; a++)
		h.push('<button type="button" class="nu_chip' +
			(FILTERS[a][0] == ST.filter ? " on" : "") +
			'" data-f="' + FILTERS[a][0] + '">' + esc(FILTERS[a][1]) + '</button>');

	ebi("nu_chips").innerHTML = h.join("");
}

function render_stat(shown) {
	var sz = 0, n = shown.length;
	for (var a = 0; a < shown.length; a++)
		if (!isdir(shown[a]))
			sz += shown[a].sz || 0;

	var word = n == 1 ? " item" : " items";
	ebi("nu_count").textContent = n + word + (sz ? " · " + humansize(sz) : "");

	ebi("nu_sort").textContent = sort_label(ST.sortKey) + " " +
		(ST.sortDir > 0 ? "↑" : "↓");
}

function sort_label(k) {
	for (var a = 0; a < SORTS.length; a++)
		if (SORTS[a][0] == k)
			return SORTS[a][1];

	return k;
}

// -- the column header -------------------------------------------------
//
// the wide band's sort control, and not a second sort: a click lands in the
// same pick_sort() the sheet uses, with the same keys and the same
// natural-direction rule. the labels are SORTS' own, so the header adds no
// string of its own to translate.
//
// SORTS' fifth key -- `n` / Items -- deliberately gets no button: there is
// no Items column for it to sit over, and a fifth cell in a header sharing
// --nu-cols with the rows would push every column one track out. `n` stays
// a sheet-only sort, at every width.
//
// [sort key, grid line]. the key is not always the line name (`ts` labels
// the `dt` column, `ext` the `ty` one), and dom order is free because
// placement is by name -- so this is written in the human column order.
var HEADS = [
	["name", "name"],
	["sz", "sz"],
	["ext", "ty"],
	["ts", "dt"]
];

// built once, at boot. render_head() then only ever writes textContent and
// aria-sort on these same nodes -- it must never rewrite the container,
// because draw() runs on the filter's 90ms debounce and an innerHTML here
// would destroy the focused header button under the user's fingers.
function build_head() {
	var h = [];
	for (var a = 0; a < HEADS.length; a++)
		h.push('<button type="button" class="nu_hcol nu_h_' + HEADS[a][1] +
			'" data-k="' + HEADS[a][0] + '"></button>');

	ebi("nu_head").innerHTML = h.join("");
}

function render_head() {
	var els = ebi("nu_head").children;
	for (var a = 0; a < els.length; a++) {
		var el = els[a],
			k = el.getAttribute("data-k"),
			on = k == ST.sortKey,
			up = ST.sortDir > 0;

		el.textContent = sort_label(k) + (on ? (up ? " ↑" : " ↓") : "");
		el.setAttribute("aria-sort", !on ? "none" :
			up ? "ascending" : "descending");
	}
}

// -- the row's meta fields ---------------------------------------------
//
// the meta line used to be one concatenated string. a column cannot be a
// substring, so each field is its own element now: narrow joins them with
// a css separator (.nu_sub > * + *::before), wide lifts them into named
// grid tracks. two rules keep both bands honest:
//
// * a cell with nothing to say is not emitted at all -- an empty span
//   would still be a link in the separator chain, and an unindexed folder
//   would render a leading "·" in front of its date;
// * dom order is size, date, type. placement is by name, so the wide
//   band's human order (name, size, type, date) is the grid's business --
//   here type goes last because it is the cell that hides below 80em, and
//   a hidden cell *between* two visible ones orphans a separator.

function cell(cls, txt) {
	return txt ? '<span class="' + cls + '">' + esc(txt) + '</span>' : "";
}

// a cell whose text differs per band ships both forms and lets css pick:
// the resize contract forbids re-rendering a row to reformat it. one
// element with two spans inside, never two bare siblings -- those would be
// two boxes in one named track, and two links in the separator chain.
function cell2(cls, n, w) {
	if (!n && !w)
		return "";

	return '<span class="' + cls + '">' +
		'<span class="nu_n">' + esc(n) + '</span>' +
		'<span class="nu_w">' + esc(w) + '</span></span>';
}

function render_list(shown) {
	var h = [];

	// the design puts a "back" row at the top of every non-root folder.
	// its subline is prose, not a field, so it is wrapped narrow-only --
	// otherwise the wide band would drop it into whichever column the
	// grid felt like giving it.
	if (vpnodes.length > 1) {
		var up = vpnodes[vpnodes.length - 2];
		h.push('<a class="nu_row nu_dir nu_back" href="' + esc(keep(SR + "/" + up[0])) + '">' +
			'<span class="nu_type">DIR</span>' +
			'<span class="nu_meat"><span class="nu_name">Back</span>' +
			'<span class="nu_sub"><span class="nu_n">parent folder</span></span></span>' +
			'<span class="nu_go">›</span></a>');
	}

	for (var a = 0; a < shown.length; a++) {
		var f = shown[a],
			d = isdir(f),
			k = kind_of(f),
			txt = chip_text(f),
			nf = d ? nfiles(f) : null,
			// a folder's recursive size and its file count are filled by
			// one query in one tuple (httpcli.py, `select sz, nf from ds`),
			// so nfiles() is the predicate for "this row's sz is real".
			// cfg.idx is not: it is true on a nodirsz volume, where sz is
			// still the 4096 of the directory inode.
			sz = d
				? (nf === null ? "" : cell2("nu_c_sz",
					nf + (nf == 1 ? " item" : " items"), humansize(f.sz)))
				: cell("nu_c_sz", humansize(f.sz)),
			dt = cell2("nu_c_dt", dt_short(f), dt_long(f)),
			// files only: a folder's ext is "---", so ext_of() would fall
			// through to guessing from the name and label `my.backup` as
			// a backup. a file with no extension gets no cell either.
			ty = d ? "" : cell("nu_c_ty", ext_of(f));

		h.push('<a class="nu_row ' + (d ? "nu_dir" : "nu_file") +
			'" href="' + esc(d ? keep(f.href) : f.href) + '">' +
			'<span class="nu_type' + (k && k != "dir" ? " nu_t_" + k : "") +
			(txt.length > 3 ? " nu_long" : "") + '">' + txt + '</span>' +
			'<span class="nu_meat">' +
			'<span class="nu_name">' + esc(nm(f)) + '</span>' +
			'<span class="nu_sub">' + sz + dt + ty + '</span></span>' +
			(d ? '<span class="nu_go">›</span>' : '') + '</a>');
	}

	if (!shown.length)
		h.push('<p class="nu_empty">' +
			(ST.q || ST.filter != "all" ? "nothing matches" : "this folder is empty") +
			'</p>');

	ebi("nu_list").innerHTML = h.join("");
}

function draw() {
	var shown = filtered();
	render_stat(shown);
	// beside render_stat, and NOT bolted into pick_sort(): the arrow is
	// state, and repainting it in the draw cycle is what keeps the header
	// and the sheet from drifting out of agreement.
	render_head();
	render_list(shown);
}

// -- sort sheet --------------------------------------------------------

function render_sheet() {
	var h = [];
	for (var a = 0; a < SORTS.length; a++) {
		var s = SORTS[a], on = s[0] == ST.sortKey;
		h.push('<button type="button" class="nu_sopt' + (on ? " on" : "") +
			'" data-k="' + s[0] + '">' +
			'<span class="nu_slab">' + esc(s[1]) + '</span>' +
			'<span class="nu_shnt">' + esc(s[2]) + '</span>' +
			'<span class="nu_sdir">' + (on ? (ST.sortDir > 0 ? "↑" : "↓") : "") +
			'</span></button>');
	}
	ebi("nu_sopts").innerHTML = h.join("");
}

function sheet(on) {
	ST.sheet = on;
	var s = ebi("nu_sheet"), v = ebi("nu_veil");

	if (on) {
		render_sheet();
		s.hidden = v.hidden = false;
		// force a synchronous reflow so the browser registers the
		// hidden->shown state before the class starts the transition.
		// NOT requestAnimationFrame: it never fires in a throttled or
		// background frame, which would leave the sheet open but parked
		// offscreen with the veil already swallowing taps.
		void s.offsetHeight;
		s.classList.add("on");
		v.classList.add("on");
	}
	else {
		s.classList.remove("on");
		v.classList.remove("on");
		setTimeout(function () {
			if (!ST.sheet)
				s.hidden = v.hidden = true;
		}, 280);
	}
}

function pick_sort(k) {
	if (ST.sortKey == k)
		ST.sortDir = -ST.sortDir;
	else {
		ST.sortKey = k;
		for (var a = 0; a < SORTS.length; a++)
			if (SORTS[a][0] == k)
				ST.sortDir = SORTS[a][3];
	}
	render_sheet();
	draw();
}

// -- context menu ------------------------------------------------------
//
// a declarative table and not a switch, the same shape 0001 uses for its
// overflow router: a later spec adds a row here instead of redesigning the
// menu.
//
//   [ key, label key, enabled(row), do(row) ]
//
// every row is an ACCELERATOR for something already reachable by a visible
// control, never the only door to it -- spec 0002 D2: nothing may be
// hover-only, because a hybrid laptop can be driven by finger at 1400px and
// an action that lived only here would be unreachable there. that is why
// copy-link and the destructive actions are absent; they land with 0001's
// selection mode and its `...` router, which gives them their visible door
// first.
//
// the row element is the whole argument: `.nu_dir` and the href are already
// on it, so nothing here has to be threaded back to the listing.

var CTX = [
	["open", "ctx_open",
		function (r) { return !!r; },
		function (r) { location.href = r.href; }],

	["dl", "ctx_dl",
		function (r) { return !r.classList.contains("nu_dir"); },
		function (r) {
			// `dl` is the server's own force-download switch (httpcli.py's
			// ouparam handling at :4714 and :4891); the bytes are the same
			// ones a plain click on the row already serves
			var h = r.getAttribute("href");
			location.href = h + (h.indexOf("?") < 0 ? "?dl" : "&dl");
		}],

	["old", "ctx_old",
		function (r) { return !!r; },
		function (r) {
			// a file has no classic page of its own, so its folder -- the
			// one we are looking at -- is what the classic UI can show.
			// ?nu0 beats the ui=nu cookie for that one request
			// (httpcli.py:7308-7309), same as the header's link.
			var h = r.classList.contains("nu_dir")
				? r.getAttribute("href").split("?")[0]
				: location.pathname;

			location.href = h + "?nu0";
		}]
];

var ctx_row = null;

function ctx_hide() {
	var el = ebi("nu_ctx");
	if (el && !el.hidden) {
		el.hidden = true;
		el.innerHTML = "";
	}
	ctx_row = null;
}

function ctx_show(row, x, y) {
	var el = ebi("nu_ctx"), h = [];
	ctx_row = row;

	for (var a = 0; a < CTX.length; a++) {
		var c = CTX[a], ok = false;
		try { ok = !!c[2](row); }
		catch (ex) { }

		h.push('<button type="button" role="menuitem" class="nu_ctxb" data-k="' +
			esc(c[0]) + '"' + (ok ? "" : " disabled") + '>' +
			esc(t(c[1])) + '</button>');
	}

	el.innerHTML = h.join("");
	// left/top before the measure, so a menu opened near the right edge is
	// not measured while wrapped against it
	el.style.left = el.style.top = "0px";
	el.hidden = false;

	var w = el.offsetWidth,
		hh = el.offsetHeight,
		vw = document.documentElement.clientWidth,
		vh = document.documentElement.clientHeight;

	// flipped rather than clamped: a menu clamped to the edge sits under
	// the cursor and the first item eats the click that opened it
	if (x + w > vw - 6)
		x = Math.max(6, x - w);

	if (y + hh > vh - 6)
		y = Math.max(6, y - hh);

	el.style.left = x + "px";
	el.style.top = y + "px";

	// focus the first live item: it makes the menu keyboard-operable, and
	// it puts the active element on a <button>, which is what lets the
	// keydown handler's typing guard let Escape through
	var b = el.querySelector(".nu_ctxb:not([disabled])");
	if (b)
		b.focus();
}

function ctx_menu(e) {
	var r = e.target && e.target.closest ? e.target.closest(".nu_row") : null;
	if (!r)
		return ctx_hide();

	e.preventDefault();
	ctx_show(r, e.clientX, e.clientY);
}

// one document click handler for both doors out: an item, or anywhere else
function ctx_click(e) {
	var b = e.target && e.target.closest ? e.target.closest(".nu_ctxb") : null;
	if (!b)
		return ctx_hide();

	var r = ctx_row, k = b.getAttribute("data-k");
	ctx_hide();

	if (!r || b.disabled)
		return;

	for (var a = 0; a < CTX.length; a++)
		if (CTX[a][0] == k)
			return CTX[a][3](r);
}

// attached and detached for real, never gated in css alone
function ctx_bind(on) {
	if (on) {
		document.addEventListener("contextmenu", ctx_menu);
		document.addEventListener("click", ctx_click);
		window.addEventListener("scroll", ctx_hide, true);
	}
	else {
		ctx_hide();
		document.removeEventListener("contextmenu", ctx_menu);
		document.removeEventListener("click", ctx_click);
		window.removeEventListener("scroll", ctx_hide, true);
	}
}

// -- load --------------------------------------------------------------

function take(ls) {
	ST.items = (ls.dirs || []).concat(ls.files || []);
	draw();
}

function fetch_ls(vpath, cb) {
	var url = vpath + (vpath.indexOf("?") < 0 ? "?" : "&") + "ls";
	var xhr = new XMLHttpRequest();
	xhr.open("GET", url, true);
	xhr.responseType = "json";
	xhr.onload = function () {
		if (this.status !== 200)
			return cb(new Error("HTTP " + this.status), null);

		var r = this.response;
		if (typeof r == "string")
			try { r = JSON.parse(r); } catch (ex) { return cb(ex, null); }

		cb(null, r);
	};
	xhr.onerror = function () { cb(new Error("network error"), null); };
	xhr.send();
}

// -- the folder tree, as it comes off the wire -------------------------
//
// `?tree=` (gen_tree, httpcli.py:6088-6169) does not return display names,
// and every quirk below is a bug if it is missed. the classic navpane's
// reader (parsetree, browser.js:7901-7938) is the reference for the shape
// -- but not for all of it: one of its lines is a live bug and is called
// out where this file deliberately parts ways with it.
//
// the widget is width-agnostic; only its container is not. so nothing here
// knows about the dock, and nothing here touches the dom.

// the tree honours `dots` only as the query param ANDed with the udot
// permission -- `self.uname in vn.axs.udot and "dots" in self.uparam`
// (httpcli.py:6114). the *listing* additionally honours a cookie
// (:7434-7436), which is the path nu's first paint takes, so these are not
// one preference with two readers: the client's own preference has to ride
// along on every single ?tree= request. `dots=y` is the cookie the classic
// UI writes (setck, browser.js:6983) and nu has no toggle of its own yet;
// for a user without udot the preference is a documented no-op here.
function tree_dots() {
	return /(^|;\s*)dots=y(;|$)/.test(document.cookie);
}

// `GET <dst>?tree=<top>[&dots][&k=<key>]` -- the same request shape the
// classic navpane sends (browser.js:7220-7232).
//
// `top` must be "." or a prefix of the request path, or the server answers
// 422 "arg funk" (httpcli.py:6068-6072). the blank form is NEVER sent:
// when `is_vproxied` and `tree` is empty the reply is nested once per
// component of args.R (:6077-6082), so a reader that takes the top-level
// object as the root paints an empty tree on every reverse-proxied
// deployment. "." always means "the folder this url points at", at every
// depth and behind every prefix, so it is what expansion uses.
//
// `dst` must be a bare path -- the dirkey goes in `key`, because the
// server reads it from its own `k` param (:6076) and a tree request without
// it gets a different answer on a dk volume.
function tree_load(top, dst, key, cb) {
	var url = dst + (dst.indexOf("?") < 0 ? "?" : "&") + "tree=" + top +
		(tree_dots() ? "&dots" : "") + (key ? "&k=" + key : "");

	var xhr = new XMLHttpRequest();
	xhr.open("GET", url, true);
	xhr.responseType = "json";
	xhr.onload = function () {
		if (this.status !== 200)
			return cb(new Error("HTTP " + this.status), null);

		var r = this.response;
		if (typeof r == "string")
			try { r = JSON.parse(r); } catch (ex) { return cb(ex, null); }

		cb(null, r && typeof r == "object" ? r : {});
	};
	xhr.onerror = function () { cb(new Error("network error"), null); };
	xhr.send();
}

// merge `a` with the k* keys. gen_tree filters the expanded child out of
// the sibling list -- `[x for x in dirs if x != excl]` (httpcli.py:6144,
// and :6138 on the dirkey path) -- and hands it back only as
// `ret["k" + quotep(excl)]` (:6094). so a reader that treats `a` as the
// child list silently drops the folder the user is currently inside.
//
// returns `wirename -> subtree | null`, null meaning "not expanded".
function tree_keys(res) {
	var ret = {}, ks = res.a || [], a;

	for (a = 0; a < ks.length; a++)
		if (ks[a] !== "")
			ret[ks[a]] = null;

	// second, so an expanded child overwrites its own placeholder rather
	// than appearing twice
	for (var k in res)
		if (k != "a" && k.charAt(0) == "k")
			ret[k.slice(1)] = res[k];

	return ret;
}

// one node of the tree.
//
//   name  decoded, for display
//   vp    decoded vpath, no prefix and no slashes at either end -- the
//         identity used by ST.tree.expanded and by the current-path match
//   ev    the same path still encoded, for the href and the next request
//   key   the dirkey, if this volume has one
//   dead  the server cannot reach this sub-volume
//   kids  child nodes, or null when this branch was never loaded
function tree_node(raw, sub, base_ev, base_vp) {
	// split the dirkey BEFORE decoding: with the `dk` volflag the key is
	// appended inside the same string, `name?k=kF73qdt_`
	// (httpcli.py:6141). quotep's safe set (util.py:2627) has no "?" in
	// it, so a literal "?" in a folder name arrives as %3F and the first
	// "?" is always the key's. dropping it as query junk would make the
	// folder unreachable.
	var m = /^([^?]*)(?:\?k=(.*))?$/.exec(raw) || ["", raw, ""],
		ev = m[1],
		key = m[2] || "",
		name = ev;

	// decode, THEN test. an unreachable sub-volume -- bos.stat fails, or
	// the user holds none of read/write/html on it (httpcli.py:6152-6158)
	// -- gets a "\n" appended at :6160 and is quoted with everything else
	// at :6161, so it arrives as "gone%0A" and not as a trailing newline.
	// classic tests the still-encoded string (browser.js:7922,
	// `ded = ks.endsWith('\n')`, on a value it only decodes at :7923) and
	// therefore never matches -- that line is not copied.
	try { name = decodeURIComponent(ev); }
	catch (ex) { }

	var dead = name.slice(-1) == "\n";
	if (dead) {
		name = name.replace(/\n+$/, "");
		ev = ev.replace(/(%0[Aa])+$/, "");
	}

	var vp = base_vp ? base_vp + "/" + name : name,
		nev = base_ev ? base_ev + "/" + ev : ev;

	if (sub)
		ST.tree.expanded[vp] = true;

	return {
		name: name,
		vp: vp,
		ev: nev,
		key: key,
		dead: dead,
		kids: sub ? tree_nodes(sub, nev, vp) : null
	};
}

function tree_nodes(res, base_ev, base_vp) {
	var keys = tree_keys(res),
		ret = [];

	for (var raw in keys)
		ret.push(tree_node(raw, keys[raw], base_ev, base_vp));

	// same collation as the listing's name sort, so the two agree
	ret.sort(function (a, b) {
		return a.name.localeCompare(b.name, undefined, {
			numeric: !!(cfg && cfg.dnsort), sensitivity: "base"
		});
	});
	return ret;
}

// the current folder, decoded, exactly as the server would spell it in
// `self.vpath`: vpnodes carries the quotep'd path with the reverse-proxy
// prefix already stripped, which is the half the server compares against.
// vpnodes[i][1] is html-escaped for the template and must not be used as
// a name.
function tree_vp(i) {
	var ev = (vpnodes[i] || ["", ""])[0].replace(/\/$/, "");
	try { return [decodeURIComponent(ev), ev]; }
	catch (ex) { return [ev, ev]; }
}

// the dirkey of the page we are on, if any
function tree_pagekey() {
	var m = /[?&]k=([^&#]*)/.exec(location.search);
	return m ? m[1] : "";
}

// the first load asks for the whole chain down to the current folder in
// ONE request, which is what the reply's k* keys are for: `top` is the
// shallowest ancestor that is still a legal, non-empty `tree=` value --
// the first path component -- and `dst` is the page's own url, so
// gen_tree recurses from `top` to `vpath` and returns every level of it
// already expanded. at the volume root there is no ancestor and no chain
// to paint, so "." asks for the root's children directly.
function tree_first(cb) {
	var deep = vpnodes.length > 1,
		root = tree_vp(deep ? 1 : 0),
		here = tree_vp(vpnodes.length - 1),
		top = deep ? root[1] : ".";

	tree_load(top, location.pathname, tree_pagekey(), function (err, res) {
		if (err)
			return cb(err, null);

		ST.tree.expanded[root[0]] = true;
		cb(null, {
			name: deep ? root[0] : "/",
			vp: root[0],
			ev: root[1],
			key: deep ? "" : tree_pagekey(),
			dead: false,
			kids: tree_nodes(res, root[1], root[0])
		});
	});
}

// expanding a branch is one request and never a recursive prefetch: "."
// against the branch's own url returns exactly its children, with no
// chain above it to re-parse and no excl to merge around.
function tree_expand(node, cb) {
	tree_load(".", SR + "/" + (node.ev ? node.ev + "/" : ""), node.key,
		function (err, res) {
			if (err)
				return cb(err);

			node.kids = tree_nodes(res, node.ev, node.vp);
			cb(null);
		});
}

// -- the folder tree, on screen ----------------------------------------
//
// render_tree() takes its container as an ARGUMENT: the dock is what
// mounts it today and 0001 card 4's bottom sheet is what mounts it at
// phone width, and building the widget twice is how two UIs for one thing
// drift apart. the container is the only width-aware half.

// the folder we are standing in, decoded, for the current-path mark
var TREE_HERE = tree_vp(vpnodes.length - 1)[0];

function tree_find(node, vp) {
	if (!node)
		return null;

	if (node.vp === vp)
		return node;

	for (var a = 0; a < (node.kids || []).length; a++) {
		var hit = tree_find(node.kids[a], vp);
		if (hit)
			return hit;
	}
	return null;
}

function tree_node_html(n) {
	var open = !!ST.tree.expanded[n.vp],
		cls = "nu_tn" + (n.dead ? " nu_tdead" : "") +
			(n.vp === TREE_HERE ? " nu_tcur" : ""),
		h = '<li class="' + cls + '">';

	// an unreachable sub-volume is a disabled node -- never a name with a
	// line break in it, and never a link, because there is nothing behind
	// it to open
	if (n.dead)
		return h + '<span class="nu_tw"></span><span class="nu_tl" title="' +
			esc(t("tree_gone")) + '">' + esc(n.name) + '</span></li>';

	// only the chevron expands. the rest of the node navigates, through
	// keep() so the ?nu mode survives -- keep() already appends &nu rather
	// than ?nu when the href carries a dirkey.
	var href = SR + "/" + (n.ev ? n.ev + "/" : "") + (n.key ? "?k=" + n.key : "");

	h += '<button type="button" class="nu_tw' + (open ? " on" : "") +
		'" data-vp="' + esc(n.vp) + '" aria-expanded="' + (open ? "true" : "false") +
		'">&rsaquo;</button>' +
		'<a class="nu_tl" href="' + esc(keep(href)) + '">' + esc(n.name) + '</a>';

	if (open && n.kids)
		h += '<ul class="nu_tul">' + tree_kids_html(n.kids) + '</ul>';

	return h + '</li>';
}

function tree_kids_html(nodes) {
	var h = [];
	for (var a = 0; a < nodes.length; a++)
		h.push(tree_node_html(nodes[a]));

	return h.join("");
}

function render_tree(el) {
	if (!ST.tree.root)
		return;

	el.innerHTML = '<h2 class="nu_th">' + esc(t("tree_h")) + '</h2>' +
		'<ul class="nu_tul nu_troot">' + tree_node_html(ST.tree.root) + '</ul>';

	el.onclick = function (e) {
		var b = e.target.closest(".nu_tw");
		if (!b)
			return;

		e.preventDefault();
		tree_toggle(el, b.getAttribute("data-vp"));
	};
}

// re-render, then put focus back on the chevron that was just clicked --
// the whole subtree is rewritten, so the button the user is holding is a
// different element afterwards
function tree_redraw(el, vp) {
	render_tree(el);
	var bs = el.querySelectorAll(".nu_tw");
	for (var a = 0; a < bs.length; a++)
		if (bs[a].getAttribute("data-vp") === vp)
			return bs[a].focus();
}

function tree_toggle(el, vp) {
	var n = tree_find(ST.tree.root, vp);
	if (!n)
		return;

	if (ST.tree.expanded[vp]) {
		ST.tree.expanded[vp] = false;
		return tree_redraw(el, vp);
	}

	// `kids` survives a collapse, so reopening a branch costs no request
	if (n.kids) {
		ST.tree.expanded[vp] = true;
		return tree_redraw(el, vp);
	}

	tree_expand(n, function (err) {
		if (err)
			return;

		ST.tree.expanded[vp] = true;
		tree_redraw(el, vp);
	});
}

// the ONLY writer of data-tree on #nu_shell. the 16em track is opt-in on
// that attribute (nu.css), so every path that does not render a dock --
// a window that never widens, a ?tree= that failed -- leaves one column
// and no empty gutter, and the column and its contents appear in the same
// frame.
function tree_dock(el) {
	el.hidden = false;
	ebi("nu_shell").setAttribute("data-tree", "1");
}

// the dock fetches when it FIRST becomes visible, not at boot: a phone
// that never widens must not pay a ?tree= roundtrip, and the one request a
// resize past 64em triggers is the correct price. once, behind a flag --
// set before the request, so flapping across the breakpoint cannot start
// a second one.
var tree_lit = false;

function tree_boot() {
	if (tree_lit)
		return;

	tree_lit = true;
	tree_first(function (err, root) {
		if (err)
			return;

		ST.tree.root = root;
		var el = ebi("nu_tree");
		render_tree(el);
		tree_dock(el);
	});
}

// -- boot --------------------------------------------------------------

(function () {
	// theme: the handoff specifies light only and puts appearance in the
	// settings screen, which is not built yet -- so follow the OS, and
	// honour a choice the previous skeleton may have stored.
	try {
		var t = localStorage.getItem("nu_thm");
		if (t)
			document.documentElement.setAttribute("data-thm", t);
	}
	catch (ex) { }

	watch_head();

	if (cfg && cfg.dsort)
		for (var a = 0; a < SORTS.length; a++)
			if (SORTS[a][0] == cfg.dsort) {
				ST.sortKey = cfg.dsort;
				ST.sortDir = SORTS[a][3];
			}

	// the classic UI strips the query from the address bar, so a bare ?nu0
	// would not survive a reload; leaving unpins instead. see docs/nu-ui.md
	var esc_a = ebi("nu_old");
	esc_a.href = location.pathname + "?nu0";
	if (STICKY)
		esc_a.onclick = function (e) { e.preventDefault(); unpin(); };

	var upa = ebi("nu_up");
	if (!upa.classList.contains("nu_hidden"))
		upa.href = keep(upa.getAttribute("href"));

	ebi("nu_chips").onclick = function (e) {
		var b = e.target.closest(".nu_chip");
		if (!b)
			return;

		ST.filter = b.getAttribute("data-f");
		render_chips();
		draw();
	};

	var qt = 0;
	ebi("nu_q").oninput = function () {
		var v = this.value;
		clearTimeout(qt);
		qt = setTimeout(function () { ST.q = v; draw(); }, 90);
	};

	ebi("nu_head").onclick = function (e) {
		var b = e.target.closest(".nu_hcol");
		if (b)
			pick_sort(b.getAttribute("data-k"));
	};

	ebi("nu_sort").onclick = function () { sheet(!ST.sheet); };
	ebi("nu_veil").onclick = function () { sheet(false); };
	ebi("nu_sopts").onclick = function (e) {
		var b = e.target.closest(".nu_sopt");
		if (b)
			pick_sort(b.getAttribute("data-k"));
	};

	// one keydown listener for the whole UI, extended in place rather than
	// joined by a second one: two listeners on document would each have to
	// re-derive the typing guard, and the day they disagree the bug is
	// invisible.
	document.addEventListener("keydown", function (e) {
		// the typing guard comes FIRST, and is deliberately wider than the
		// one it is modeled on: the classic UI reads the active element the
		// same way (browser.js:6237-6238) but then guards on `input` alone
		// (:6306-6307). a textarea eats arrow keys exactly like #nu_q does,
		// a <select> eats them to change its value, and a contenteditable
		// eats them to move a caret -- the extra branches cost nothing and
		// `isContentEditable` appears nowhere else under web/ because
		// nothing else here has had to care yet.
		var ae = document.activeElement,
			aet = ae ? (ae.nodeName || "").toLowerCase() : "";

		if (aet == "input" || aet == "textarea" || aet == "select" ||
			(ae && ae.isContentEditable))
			return;

		var k = e.key;

		if (k == "Escape") {
			ctx_hide();

			if (ST.sheet)
				sheet(false);

			return;
		}

		// the menu owns the keyboard while it is open; walking the list
		// underneath it would drag focus out from under the menu
		if (ctx_row)
			return;

		// never steal a browser shortcut; shift is left alone because
		// shift+arrow is range selection, and selection is 0001's card 5
		if (e.ctrlKey || e.altKey || e.metaKey)
			return;

		// focus follows navigation and NOTHING else -- no selection state
		// is created here. the rows are already <a href> elements, so they
		// are focusable, Enter is the browser's own activation and needs no
		// handler, and .focus() does the scrolling.
		var rows = ebi("nu_list").querySelectorAll(".nu_row");
		if (!rows.length)
			return;

		var cur = -1;
		for (var a = 0; a < rows.length; a++)
			if (rows[a] === ae) {
				cur = a;
				break;
			}

		var nxt;
		if (k == "ArrowDown")
			nxt = cur < 0 ? 0 : Math.min(cur + 1, rows.length - 1);
		else if (k == "ArrowUp")
			nxt = cur < 0 ? rows.length - 1 : Math.max(cur - 1, 0);
		else if (k == "Home")
			nxt = 0;
		else if (k == "End")
			nxt = rows.length - 1;
		else
			return;

		e.preventDefault();
		rows[nxt].focus();
	});

	// --ui-notree has meant "hide navpane in the UI" since __main__.py's
	// 2026, and nu is the first UI that could not see it. the key is in
	// js_htm only when the volflag is truthy (authsrv.py:3338-3341), so a
	// plain truthiness read is the whole gate -- and it sits here, above
	// the subscription, so the dock is neither rendered nor fetched and
	// #nu_shell never gets its data-tree.
	//
	// otherwise the dock is a wide-band surface, so the widget is only
	// ever built once the band is actually entered -- at boot if we start
	// there, and otherwise on the first crossing. CAP re-reads the query
	// on change, so a window dragged wider gets its dock without a reload.
	if (!srvcfg.ui_notree) {
		if (CAP.wide)
			tree_boot();
		else
			CAP.on("wide", function (v) { if (v) tree_boot(); });
	}

	// the right-click menu is a mouse affordance, so the listener is
	// installed only where there is a mouse -- and removed again the moment
	// there is not. CAP re-reads the query on change, so a tablet that gets
	// a trackpad gains the menu, and a hybrid folded back into a slate
	// loses it, both without a reload.
	//
	// --ui-noctxb ("hide context-buttons in the UI", __main__.py:2029) is
	// the admin's existing switch and it is read before anything else: with
	// the volflag set there is no listener and no subscription either, so
	// right-click falls through to the browser's own menu at every width
	// and on every pointer.
	if (!srvcfg.ui_noctxb) {
		ctx_bind(CAP.fine);
		CAP.on("fine", function (v) { ctx_bind(v); });
	}

	render_chips();
	build_head();

	if (ls0)
		return take(ls0);

	// shouldn't happen: is_js is forced for this template
	fetch_ls(location.pathname, function (err, ls) {
		if (err)
			return (ebi("nu_list").innerHTML =
				'<p class="nu_empty">could not load listing: ' + esc(err.message) +
				' &mdash; <a href="?nu0">try the classic UI</a></p>');

		take(ls);
	});
})();

var J_NU = 2;
