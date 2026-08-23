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
	sheet: false
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

	var lab = "Name";
	for (var a = 0; a < SORTS.length; a++)
		if (SORTS[a][0] == ST.sortKey)
			lab = SORTS[a][1];

	ebi("nu_sort").textContent = lab + " " + (ST.sortDir > 0 ? "↑" : "↓");
}

function render_list(shown) {
	var h = [];

	// the design puts a "back" row at the top of every non-root folder
	if (vpnodes.length > 1) {
		var up = vpnodes[vpnodes.length - 2];
		h.push('<a class="nu_row nu_dir" href="' + esc(keep(SR + "/" + up[0])) + '">' +
			'<span class="nu_type">DIR</span>' +
			'<span class="nu_meat"><span class="nu_name">Back</span>' +
			'<span class="nu_sub">parent folder</span></span>' +
			'<span class="nu_go">›</span></a>');
	}

	for (var a = 0; a < shown.length; a++) {
		var f = shown[a],
			d = isdir(f),
			k = kind_of(f),
			txt = chip_text(f),
			nf = d ? nfiles(f) : null,
			sub = d
				? (nf === null ? "" : nf + (nf == 1 ? " item · " : " items · ")) + dt_short(f)
				: humansize(f.sz) + " · " + dt_short(f);

		h.push('<a class="nu_row ' + (d ? "nu_dir" : "nu_file") +
			'" href="' + esc(d ? keep(f.href) : f.href) + '">' +
			'<span class="nu_type' + (k && k != "dir" ? " nu_t_" + k : "") +
			(txt.length > 3 ? " nu_long" : "") + '">' + txt + '</span>' +
			'<span class="nu_meat">' +
			'<span class="nu_name">' + esc(nm(f)) + '</span>' +
			'<span class="nu_sub">' + esc(sub) + '</span></span>' +
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

	ebi("nu_sort").onclick = function () { sheet(!ST.sheet); };
	ebi("nu_veil").onclick = function () { sheet(false); };
	ebi("nu_sopts").onclick = function (e) {
		var b = e.target.closest(".nu_sopt");
		if (b)
			pick_sort(b.getAttribute("data-k"));
	};

	document.addEventListener("keydown", function (e) {
		if (e.key == "Escape" && ST.sheet)
			sheet(false);
	});

	render_chips();

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
