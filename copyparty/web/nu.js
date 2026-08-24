// the new UI. see docs/nu-ui.md for how it coexists with the classic one,
// and design-handoff/ for the design this implements.
//
// this is the base layer: list, row, navigation, header (search, filter
// chips, status line), sorting, the action bar, the ... router, the
// preference layer, the settings screen, the grid and the folder tree in
// both of its containers.
// selection, swipe and the image viewer are not here yet -- until they
// are, the router's `classic UI` row is the door to them.
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
// `Ls` is declared in nu.html's bootstrap block, not here and not in
// util.js: the classic UI's `Ls = {}` lives in util.js:310-311 and nu does
// not load util.js (2415 lines, and it installs window.onerror at import,
// util.js:307). the `tl/{{ lang }}.js` tag sits between that block and this
// file, guarded on `lang != "eng"` -- there is no web/tl/eng.js and --lang
// defaults to eng, so an unguarded tag 404s on every default install.
//
// the english table below is nu's own for the same reason: browser.js
// carries Ls.eng for the classic UI and nu does not load browser.js either.
// two rules keep it honest:
//
// * a string the classic UI already ships is reused BY KEY, so the 22 tl
//   files answer it with no new translation work -- gt_* are the grid
//   view's sort labels (browser.js:487-491);
// * every genuinely new string is namespaced `nu_`, because a tl file's
//   top-level keys are the classic UI's and a bare name like `s_sz` is
//   already taken over there. a collision would not fail, it would render
//   someone else's translation.

Ls.eng = {
	// 0002's STR, lifted verbatim
	tree_h: "Folders",
	tree_gone: "this volume is unreachable",
	ctx_open: "Open",
	ctx_dl: "Download",
	ctx_old: "Open in the classic UI",

	// the classic UI's keys, reused
	gt_sort: "Sort by",
	gt_name: "Name",
	gt_ts: "Date",
	gt_sz: "Size",
	gt_ext: "Type",

	// the filter chips
	nu_f_all: "All",
	nu_f_dir: "Folders",
	nu_f_vid: "Video",
	nu_f_img: "Images",
	nu_f_doc: "Documents",
	nu_f_aud: "Audio",

	// the sort sheet: the fifth label, and every hint
	nu_s_n: "Items",
	nu_sh_name: "A \u2192 Z",
	nu_sh_ts: "newest first",
	nu_sh_sz: "largest first",
	nu_sh_ext: "by extension",
	nu_sh_n: "folders only",
	nu_s_rev: "tap again to reverse",

	// the view control, in the status line and mirrored in the ... router.
	// the button is labelled with the view it takes you TO, which is one
	// unambiguous word to a sighted user and no sentence at all to a screen
	// reader -- hence the two `_t` forms, which are the aria-labels.
	nu_v_grid: "Grid",
	nu_v_list: "List",
	nu_v_grid_t: "Switch to grid view",
	nu_v_list_t: "Switch to list view",

	// the folder-tree sheet. its heading is `tree_h`, the same key the dock
	// already labels the widget with -- one word for one thing, in every
	// language -- so only the two states the dock never shows are new here.
	nu_tsh_wait: "loading\u2026",
	nu_tsh_err: "could not load the folder tree",

	// the header's static text, filled at boot
	nu_q: "Search in this folder",

	// the action bar, at both of its placements. its selection slot set is
	// three more rows in the same table shape, and `Baixar` is not a new
	// string at all -- ctx_dl is the same word, already translated.
	nu_a_up: "Upload files",
	nu_a_mkdir: "New folder",
	nu_a_more: "\u22ef",
	nu_a_more_t: "More",
	nu_mk_ask: "name of the new folder:",
	nu_mk_err: "could not create the folder",
	nu_a_mv: "Move",
	nu_a_rm: "Delete",
	nu_mv_soon: "moving files is not in this UI yet",
	nu_rm_ask: "delete %?",
	nu_rm_err: "could not delete",

	// the swipe. `Link` is the button's whole label because it has 84px to
	// say it in; the right-click row has a menu's worth of room and says
	// `Copy link`. the swipe's destructive button reuses nu_a_rm -- one
	// word for one thing, in every language.
	nu_sw_link: "Link",
	ctx_link: "Copy link",
	nu_cp_ask: "copy this link:",

	// pull-to-refresh: the three states of one strip
	nu_pl_pull: "Pull to refresh",
	nu_pl_go: "Release to refresh",
	nu_pl_busy: "Refreshing…",

	// the ... router: two section headers and nine rows
	nu_m_view: "View",
	nu_m_here: "In this folder",
	nu_m_srv: "Server",
	nu_m_newmd: "New .md note",
	nu_m_msg: "Send a message to the log",
	nu_m_unpost: "Undo a recent upload",
	nu_m_unpost_m: "unpost",
	nu_m_rups: "Recent uploads",
	nu_m_shr: "Shares",
	nu_m_cfg: "Settings",
	nu_m_cfg_m: "theme, sizes, upload",
	nu_m_cpa: "Control panel",
	nu_m_cpa_m: "volumes, account, admin",
	nu_m_old: "The classic UI",

	// the settings screen: four group headers, its rows, and the labels of
	// the controls inside them
	nu_c_disp: "Display",
	nu_c_size: "Sizes",
	nu_c_look: "Appearance",
	nu_c_acct: "Account",
	nu_c_dots: "Hidden files",
	nu_c_dots_s: "show files whose name starts with a dot",
	nu_c_dir1st: "Folders first",
	nu_c_nsort: "Natural sort",
	nu_c_nsort_s: "“item 2” before “item 10”",
	nu_c_thumbs: "Thumbnails",
	nu_c_grid: "Grid view",
	nu_c_crop: "Crop thumbnails",
	nu_c_crop_s: "fill the tile instead of fitting inside it",
	nu_c_3x: "Sharp thumbnails",
	nu_c_3x_s: "ask for 3x pixels; slower, and heavier on the server",
	nu_c_dens: "Roomy rows",
	nu_c_dens_s: "keep the touch-sized row on a wide screen",
	nu_c_szfmt: "Size format",
	nu_c_sz_a: "Auto",
	nu_c_sz_d: "Decimal",
	nu_c_sz_b: "Binary",
	nu_c_acc: "Accent colour",
	nu_c_a300: "Violet",
	nu_c_a250: "Blue",
	nu_c_a160: "Green",
	nu_c_a60: "Amber",
	nu_c_thm: "Theme",
	nu_c_thm_l: "Light",
	nu_c_thm_d: "Dark",
	nu_c_thm_a: "System",
	nu_c_lang: "Language",
	nu_c_out: "Log out",
	nu_c_soon: "not in this UI yet",

	// selection mode: the nav bar's toggle, the two states it names, and
	// the status line's two operators
	nu_sel: "Select",
	nu_seld: "Done",
	nu_nsel: "selected",
	nu_selall: "All",
	nu_selinv: "Invert",
	nu_selall_t: "Select everything the filter is showing",
	nu_selinv_t: "Invert the selection over what the filter is showing",

	// the status line and a folder's own count
	nu_item: "item",
	nu_items: "items",

	// the list
	nu_back: "Back",
	nu_back2: "parent folder",
	nu_nomatch: "nothing matches",
	nu_empty: "this folder is empty",
	nu_eload: "could not load listing",
	nu_eold: "try the classic UI"
};

// per-key, and that is the whole point of writing a second t(): the classic
// UI resolves the language as one object (`Ls[lang] || Ls.eng`,
// browser.js:716), so a key its tl file predates comes back `undefined` and
// renders as "undefined". here every key falls back on its own, which is
// what lets nu ship strings the 22 tl files have never seen without making
// a translated install worse than an english one.
var L = Ls[lang] || null;

function t(k) {
	return (L && L[k]) || Ls.eng[k] || k;
}

// -- preferences -------------------------------------------------------
//
// one key per preference in localStorage, seeded from the volume's own
// defaults in `cfg` / `srvcfg` so a volume configured with `--nsort` or
// `--grid` opens the way its operator intended before the user has touched
// anything. spec 0001 D3.
//
// the accessor is wrapped because it THROWS, it does not return null: a
// private window, a browser set to block site data, or an iframe on a
// third-party origin all raise on the getter itself, and an unguarded read
// at boot would take the whole UI down before the first row is painted.
//
// KEY NAMES ARE A CONTRACT, not a detail. four of these have an identical
// counterpart in the classic UI's own settings pane, and for those four nu
// reuses the classic UI's bare key AND its "1"/"0" encoding
// (`bcfg_get`/`bcfg_set`, util.js:1314-1332, over `sread`/`swrite`,
// util.js:1243-1259) -- `dotfiles` (browser.js:6981), `dir1st` (:6990),
// `nsort` (:6989) and `thumbs` (:6040). the handoff asks for exactly this
// (README:220-222): flip "folders first" in either UI and the other one
// already agrees. everything nu invents is `nu_`-prefixed instead, because
// the flat localStorage namespace is shared with the classic UI and a bare
// name of our own would be a collision waiting to happen.

function sget(k) {
	try { return localStorage.getItem(k); }
	catch (ex) { return null; }
}

function sset(k, v) {
	try {
		if (v === null || v === undefined)
			localStorage.removeItem(k);
		else
			localStorage.setItem(k, v);
	}
	catch (ex) { }
}

// the two thumbnail volflags an admin can FORCE. `crop` and `th3x` reach us
// as "y"/"n", or "fy"/"fn" when the volume decides (authsrv.py:3272-3273).
// the classic UI honours the `f` by overwriting its own toggle on every
// loadgrid (browser.js:5828-5832); here it is honoured the other way round
// -- a forced value is not a preference at all, so its settings row is
// gated away entirely rather than rendered as a switch that does nothing,
// the same rule the dotfiles row lives by (spec 0001 D3).
function vflag(k) {
	return String((cfg && cfg[k]) || "");
}

function vforced(k) {
	return vflag(k).charAt(0) == "f";
}

function vdef(k) {
	return vflag(k).slice(-1) == "y";
}

// read at CALL time and never latched: a window dragged to another screen
// changes it, and this is only ever asked for a default.
function dpr() {
	return window.devicePixelRatio || 1;
}

// `b` marks a boolean (the "1"/"0" encoding); `ok` is the legal set for an
// enum, so a key hand-edited to junk falls back to the default instead of
// rendering an undefined branch. `d` is a FUNCTION and not a value: the
// table is built at load, and `cfg` must be read at the moment it is asked
// for, not baked into a literal here.
var PREFS = {
	// the four shared with the classic UI -- bare keys, on purpose
	dotfiles: { b: 1, d: function () { return !!srvcfg.see_dots; } },
	dir1st: { b: 1, d: function () { return true; } },
	nsort: { b: 1, d: function () { return !!(cfg && cfg.dnsort); } },
	thumbs: { b: 1, d: function () { return true; } },
	// crop and 3x are the classic UI's own keys, in the classic UI's own
	// "1"/"0" encoding (bcfg_set, util.js:1330), so the two UIs agree about
	// a volume's thumbnails instead of each keeping half an answer.
	// `3` is asked for on a hi-dpi screen by default, because that is the
	// screen the extra pixels exist for; the volume's own default wins when
	// it says yes, and forcing is handled above pref() entirely.
	gridcrop: { b: 1, d: function () { return vdef("dcrop"); } },
	grid3x: { b: 1, d: function () { return vdef("dth3x") || dpr() > 1; } },

	// nu's own. `nu_thm` predates this table -- the boot skeleton already
	// wrote it -- and is folded in here rather than left as a second,
	// hand-rolled reader.
	nu_grid: { b: 1, d: function () { return !!(cfg && cfg.dgrid); } },
	nu_dens: { b: 1, d: function () { return false; } },
	nu_szfmt: { ok: ["auto", "si", "iec"], d: function () { return "auto"; } },
	nu_acch: { ok: ["300", "250", "160", "60"], d: function () { return "300"; } },
	nu_thm: { ok: ["light", "dark"], d: function () { return ""; } }
};

function pref(k) {
	var p = PREFS[k];
	if (!p)
		return null;

	var v = sget(k);
	if (v === null || (p.ok && p.ok.indexOf(v) < 0))
		return p.d();

	return p.b ? v == "1" : v;
}

function setpref(k, v) {
	var p = PREFS[k];
	if (!p)
		return;

	// an enum's empty value REMOVES the key rather than storing "": the
	// stored empty string would read back as "not in ok" and resolve to the
	// default anyway, and a key that is absent is the honest way to spell
	// "no choice made" -- which is what the theme's `system` state is.
	sset(k, p.b ? (v ? "1" : "0") : (v || null));
}

// the preferences that are pure presentation: three writes on <html>, done
// at boot so the FIRST paint already matches them, and redone when the
// settings screen flips one. none of them needs a stylesheet of its own --
// the theme's three states, the density opt-out and the accent's --acc-h are
// all already in nu.css, and this is the only thing that writes them.
function apply_prefs() {
	var d = document.documentElement,
		thm = pref("nu_thm");

	if (thm)
		d.setAttribute("data-thm", thm);
	else
		d.removeAttribute("data-thm");

	// the DENSITY writes this attribute and nothing else. spec 0002 owns
	// the mechanism -- .nu_row reads var(--row-pad, 14px 16px), the wide
	// band redefines --row-pad compact on :root, and :root[data-dens="touch"]
	// overrides it back on specificity, because a media query adds none.
	// restyling .nu_row from here would fight that rule instead of using it.
	if (pref("nu_dens"))
		d.setAttribute("data-dens", "touch");
	else
		d.removeAttribute("data-dens");

	// the VIEW is an attribute for the same reason the theme is one: css
	// reads it in two places -- the grid container's own layout, and the
	// column header it hides at EVERY width, because a column header is a
	// list affordance and the grid has no columns -- and it has to be true
	// at the FIRST paint. a grid restored from localStorage one draw()
	// later would flash a list first. draw() then picks the renderer from
	// the same preference, so the attribute and the markup can never
	// disagree about which view is on screen.
	if (pref("nu_grid"))
		d.setAttribute("data-view", "grid");
	else
		d.removeAttribute("data-view");

	// the ACCENT is a hue, and one inline custom property is the whole of
	// it: --accent and --ring are each defined three times in nu.css (light,
	// prefers-dark, and the explicit dark theme) and all six now read
	// --acc-h, so this survives a theme switch and the focus ring moves with
	// it. an inline property on <html> outranks every :root rule in the
	// sheet, which is what makes that true in both directions.
	try { d.style.setProperty("--acc-h", pref("nu_acch")); }
	catch (ex) { }
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

// the size format, per README:208 -- Auto / Decimal / Binário. `auto` is
// the shape this file always had (1024 with the short suffixes, which is
// what a file manager shows); the other two say which one they are, and
// name their units accordingly, because "1.0 KB" meaning 1024 bytes is the
// ambiguity the user picked a format to escape.
//
//   [ divisor, suffixes ]
var UNITS = {
	auto: [1024, ["B", "KB", "MB", "GB", "TB", "PB"]],
	si: [1000, ["B", "kB", "MB", "GB", "TB", "PB"]],
	iec: [1024, ["B", "KiB", "MiB", "GiB", "TiB", "PiB"]]
};

// THREE callers, and they are meant to move together: a row's file size and
// a folder's wide-band size (render_list) and the status line's total
// (render_stat). the one thing this must never reformat is the folder
// cell's NARROW form -- that is an item count, not a size, and it is built
// from nfiles() and never passes through here.
function humansize(n) {
	if (!n)
		return n === 0 ? "0 B" : "";

	var u = UNITS[pref("nu_szfmt")] || UNITS.auto,
		div = u[0],
		tab = u[1],
		i = 0;

	while (n >= div && i < tab.length - 1) { n /= div; i++; }
	return (i && n < 10 ? n.toFixed(1) : Math.round(n)) + " " + tab[i];
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

// [key, label key, kind]. the label is a key and not a string: the table is
// built at load, and t() has to be free to answer differently per language.
var FILTERS = [
	["all", "nu_f_all", null],
	["dir", "nu_f_dir", "dir"],
	["vid", "nu_f_vid", "vid"],
	["img", "nu_f_img", "img"],
	["doc", "nu_f_doc", "doc"],
	["aud", "nu_f_aud", "aud"]
];

// [key, label key, hint key, natural direction]. natural direction per key:
// name/type ascend, the rest descend.
//
// the labels are read by THREE callers -- the sort sheet (render_sheet), the
// status line (sort_label) and the wide band's column header (render_head).
// they are keys here so translating this one table translates all three;
// there is deliberately no fourth source.
var SORTS = [
	["name", "gt_name", "nu_sh_name", 1],
	["ts", "gt_ts", "nu_sh_ts", -1],
	["sz", "gt_sz", "nu_sh_sz", -1],
	["ext", "gt_ext", "nu_sh_ext", 1],
	["n", "nu_s_n", "nu_sh_n", -1]
];

var ST = {
	items: [],
	filter: "all",
	q: "",
	sortKey: "name",
	sortDir: 1,
	// the OPEN SHEET'S ELEMENT ID, or null -- not a boolean. "is a sheet
	// open" and "which sheet is open" stopped being the same question the
	// moment there was more than one tenant.
	sheet: null,
	// the folder tree: `root` is one node (see tree_node), `expanded` is
	// vpath -> bool, the open/closed state. a node's `kids` is the cache,
	// so collapsing and reopening a branch costs no second request.
	tree: { root: null, expanded: {} },
	// selection. `selmode` is the mode the nav bar's right slot toggles;
	// `sel` is name -> 1 over the folder we are standing in, and NOT over
	// filtered(): a selection made before the filter narrowed is still a
	// selection, and the action bar has to act on all of it. `selanchor`
	// is the last checkbox touched -- what a shift-click extends from.
	selmode: false,
	sel: {},
	selanchor: null
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

// ?setck is an existing server endpoint (setck(), httpcli.py:5913-5925) and
// nu invents no cookie of its own: it rejects any `k=v` longer than nine
// characters, so the channel is reserved for the short names that already
// exist -- `ui` here, `dots` below. an EMPTY value expires the cookie
// (t = 0 at :5918), which is how both callers clear one.
function setck(kv, cb) {
	var xhr = new XMLHttpRequest();
	xhr.open("GET", SR + "/?setck=" + kv, true);
	xhr.onloadend = function () { if (cb) cb(); };
	xhr.send();
}

function unpin() {
	setck("ui=", function () { location.href = location.pathname; });
}

// -- dotfiles ----------------------------------------------------------
//
// the ONE preference nu cannot enforce on its own, and the reason spec 0001
// D3 calls it the trap. dotfiles are filtered SERVER-side
// (httpcli.py:7433-7437), so a client-side toggle could only ever hide what
// the server already sent; it can never reveal what the server withheld.
//
//   if not self.can_dot or (
//       "dots" not in self.uparam and (is_ls or "dots" not in self.cookies)
//   ):
//
// read that second line carefully: `is_ls` SHORT-CIRCUITS the cookie. the
// first paint is not an `?ls` request -- ls0 is embedded in the html -- so a
// cookie-only implementation appears to work on load and then silently drops
// every dotfile on the very next tap, when fetch_ls() refetches. correct
// once, wrong forever after, with no error anywhere.
//
// so the rule is: `dots` rides the QUERY STRING on every ?ls and every
// ?tree= request, and the cookie exists only so the first paint of the next
// page load agrees with the toggle.

function can_dot() {
	// `dot` is in the perms list the server hands the template when
	// self.can_dot (httpcli.py:7278-7279) -- the same answer the filter
	// above tests, so the client never has to guess at it
	return !!(perms && perms.indexOf("dot") + 1);
}

// read at CALL time, never latched: this is what every listing url asks.
function want_dots() {
	return can_dot() && pref("dotfiles");
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

// both of these used to be constants -- `dir1st` a literal `true`, and the
// collation `cfg.dnsort` straight off the volume. they are preferences now,
// which is not a new read of `cfg`: the volume default is still what an
// untouched key answers with, it is just overridable from here on.
function cmp_name(a, b) {
	return nm(a).localeCompare(nm(b), undefined, {
		numeric: !!pref("nsort"), sensitivity: "base"
	});
}

function sorted(list) {
	var k = ST.sortKey, d = ST.sortDir, dir1st = pref("dir1st");

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

// -- selection ---------------------------------------------------------
//
// the key is the row's own BASENAME -- decoded, exactly what nm() answers
// -- and never an index into the listing: draw() re-sorts and re-filters
// under the selection every time a chip is tapped or a letter is typed,
// and an index would follow whichever row happened to slide into that slot.
//
// there is no "selection renderer" either. selection is state on the two
// renderers that already exist: render_list and render_grid read ST.sel
// while they draw, and everything below asks for a redraw through the same
// draw() the filter uses. a third writer of #nu_list would be a third place
// for the row markup to drift.

function sel_has(f) {
	return !!ST.sel[nm(f)];
}

function sel_set(f, v) {
	var k = nm(f);
	if (v)
		ST.sel[k] = 1;
	else
		delete ST.sel[k];
}

function sel_n() {
	var n = 0;
	for (var k in ST.sel)
		n++;

	return n;
}

// the selected items in the listing's own order, over ST.items and not
// over filtered(): the count in the status line and the list the action
// bar posts have to be the same list, and a filter changed after the
// selection was made must not silently shrink what Excluir destroys.
function sel_list() {
	var ret = [];
	for (var a = 0; a < ST.items.length; a++)
		if (sel_has(ST.items[a]))
			ret.push(ST.items[a]);

	return ret;
}

// the item's full vpath, DECODED -- and that is not a detail. `?delete`
// takes real paths and resolves them against the vfs (handle_rm ->
// up2k._handle_rm -> vfs.get, httpcli.py:6777), while `?zip` takes the
// url-encoded basename and unquotep()s it itself (:3125-3148). the two
// endpoints want opposite spellings of the same name, so the file with a
// space in it is where a single "just send href" would quietly fail.
// measured against a live server: `["/vol/sp ace &x.txt"]` deletes,
// `["/vol/sp%20ace%20%26x.txt"]` answers 400 file-not-found.
//
// location.pathname is the encoded form, so it is decoded here too; nm()
// already answers decoded.
function vp_of(f) {
	var base = location.pathname;
	if (base.slice(-1) != "/")
		base += "/";

	try { base = decodeURIComponent(base); }
	catch (ex) { }

	return base + nm(f);
}

// the ABSOLUTE url, because a copied link is going somewhere else -- a
// relative href pasted into a chat is not a link at all. the listing's
// href is already url-encoded and already carries the dirkey when we
// arrived through one, so it is the right string; it is RESOLVED against
// the document rather than concatenated onto location.origin, so a
// reverse-proxy prefix comes along without anybody here knowing about it.
//
// `?nu` is deliberately not appended. keep() is for the links this UI
// follows itself; a link handed to somebody else should open whichever UI
// that person's cookie asks for.
function url_of(f) {
	try {
		var a = document.createElement("a");
		a.href = f.href;
		return a.href || f.href;
	}
	catch (ex) { return f.href; }
}

// navigator.clipboard is https-only, and copyparty is served over plain
// http on a LAN more often than it is not -- so the execCommand path below
// is not a legacy fallback, it is the one that actually runs on the
// deployment this UI is for.
function copy_link(f) {
	var u = url_of(f);

	try {
		if (navigator.clipboard && navigator.clipboard.writeText)
			return navigator.clipboard.writeText(u)["catch"](function () {
				copy_dom(u);
			});
	}
	catch (ex) { }

	copy_dom(u);
}

function copy_dom(txt) {
	var ta = null;
	try {
		ta = document.createElement("textarea");
		ta.value = txt;
		// parked off-screen and not display:none: a hidden textarea cannot
		// be selected, and the copy then succeeds at copying nothing
		ta.style.position = "fixed";
		ta.style.left = "-9999px";
		document.body.appendChild(ta);
		ta.focus();
		ta.select();
		document.execCommand("copy");
		document.body.removeChild(ta);
		return;
	}
	catch (ex) {
		try { if (ta) document.body.removeChild(ta); }
		catch (ex2) { }
	}

	// last door: a prompt the user can copy out of by hand. a link the UI
	// silently failed to copy is worse than one it admits it cannot.
	try { prompt(t("nu_cp_ask"), txt); }
	catch (ex) { }
}

function item_by_key(k) {
	if (!k)
		return null;

	for (var a = 0; a < ST.items.length; a++)
		if (nm(ST.items[a]) == k)
			return ST.items[a];

	return null;
}

// the one door in and out of the mode. leaving it CLEARS the selection --
// "Concluir" is the design's own word for finished, and a mode left with
// rows still marked would delete them the next time it was entered.
function set_sel(on) {
	ST.selmode = !!on;
	if (!ST.selmode) {
		ST.sel = {};
		ST.selanchor = null;
	}
	sel_fx();
}

// the mode's whole presentation, in one place: the attribute the css bands
// read, the nav bar's label, the action bar's slot set, and a redraw. every
// entry point below ends here rather than each repainting its own corner.
function sel_fx() {
	var de = document.documentElement,
		b = ebi("nu_selb");

	if (ST.selmode)
		de.setAttribute("data-sel", "1");
	else
		de.removeAttribute("data-sel");

	if (b) {
		b.textContent = t(ST.selmode ? "nu_seld" : "nu_sel");
		b.setAttribute("aria-pressed", ST.selmode ? "true" : "false");
	}

	// the bar swaps slot sets with the mode, and its live gates read the
	// count -- so it is repainted on every change of the selection, not
	// only on entering and leaving
	render_acts();

	draw();
}

// shift extends over what the user can SEE -- filtered(), in the order the
// list is drawn in -- and applies the anchor's own state to the whole run,
// which is the classic UI's rule (msel.seltgl, browser.js:8831-8856).
function sel_range(f) {
	var shown = filtered(),
		k = nm(f),
		o1 = -1, o2 = -1;

	for (var a = 0; a < shown.length; a++) {
		var ak = nm(shown[a]);
		if (ak == ST.selanchor)
			o1 = a;
		if (ak == k)
			o2 = a;
	}

	if (o1 < 0 || o2 < 0)
		return sel_set(f, !sel_has(f));

	var st = sel_has(shown[o1]);
	if (o1 > o2)
		o2 = [o1, o1 = o2][0];

	for (var a = o1; a <= o2; a++)
		sel_set(shown[a], st);
}

// the status line's two operators, and they work on filtered() -- never on
// ST.items. the design puts them one line under the filter chips and the
// search box (README:108-111), so a `Tudo` that reached past what the user
// can see would select rows they filtered out on purpose. what is already
// marked outside the filter is left exactly as it was.

function sel_all() {
	var shown = filtered();
	for (var a = 0; a < shown.length; a++)
		sel_set(shown[a], true);

	// the anchor follows the last thing touched, so a shift-click after a
	// select-all extends from the end of the run and not from nowhere
	ST.selanchor = shown.length ? nm(shown[shown.length - 1]) : null;
	sel_fx();
}

function sel_inv() {
	var shown = filtered();
	for (var a = 0; a < shown.length; a++)
		sel_set(shown[a], !sel_has(shown[a]));

	sel_fx();
}

// the delegated click on #nu_list, installed at every width and on every
// pointer -- it is what makes a checkbox a control inside an <a href>.
//
// spec 0002 D2: the row STAYS a link and a plain click still navigates. so
// this preventDefaults exactly three things and nothing else -- a tap on
// the checkbox, a modified click, and the click the browser sends after a
// long-press has already turned the row into a selection.
function sel_click(e) {
	var el = e.target,
		row = el && el.closest ? el.closest(".nu_row, .nu_tile") : null;

	// swallowed even off a row: the finger that lifted after a long-press
	// may well have drifted onto the row's padding
	if (LP.eat) {
		LP.eat = false;
		e.preventDefault();
		return;
	}

	// the single most likely mis-tap in the whole design (README:245): a
	// row is standing open, the thumb comes down anywhere on the list, and
	// what it means is "put that back" -- never "open this file". checked
	// before the row test, because the thumb may well have landed on a
	// DIFFERENT row than the open one, and it still means the same thing.
	if (SW.open) {
		sw_close();
		e.preventDefault();
		return;
	}

	if (!row || row.classList.contains("nu_back"))
		return;

	var ck = el.closest(".nu_ck, .nu_tk"),
		mod = e.shiftKey || e.ctrlKey || e.metaKey;

	if (!ck && !mod)
		return;

	// ctrl-click on a link is normally "open in a new tab" and shift-click
	// is "open in a new window"; 0002 D2 spends both on selection, exactly
	// as the classic UI does, so both have to be taken from the browser.
	e.preventDefault();

	var f = item_by_key(row.getAttribute("data-k"));
	if (!f)
		return;

	if (e.shiftKey && ST.selanchor)
		sel_range(f);
	else {
		sel_set(f, !sel_has(f));
		ST.selanchor = nm(f);
	}

	// a shift-click through a list of links leaves a text selection behind
	try { window.getSelection().removeAllRanges(); }
	catch (ex) { }

	ST.selmode = true;
	sel_fx();
}

// -- the long-press ----------------------------------------------------
//
// 420ms, a 6px cancel threshold and navigator.vibrate(12) (README:243).
// the threshold is a DISTANCE and not a per-axis one: a 5px-by-5px drag is
// a 7px drag, and a list that scrolls diagonally under a thumb is exactly
// how a scroll gets mistaken for a press.
//
// installed only under CAP.coarse, from JS. a css-only gate would hide the
// affordance and leave the listener attached, and a long-press waiting for
// a mouse is the bug CAP exists to prevent (spec 0002 D2).

var LP = { t: null, x: 0, y: 0, k: null, eat: false };

function lp_cancel() {
	if (LP.t) {
		clearTimeout(LP.t);
		LP.t = null;
	}
}

function lp_down(e) {
	lp_cancel();

	// two fingers is a pinch, never a press
	var tt = e.touches && e.touches.length == 1 ? e.touches[0] : null,
		row = tt && e.target && e.target.closest ?
			e.target.closest(".nu_row, .nu_tile") : null;

	if (!row || row.classList.contains("nu_back"))
		return;

	LP.x = tt.clientX;
	LP.y = tt.clientY;
	LP.k = row.getAttribute("data-k");
	LP.t = setTimeout(lp_fire, 420);
}

function lp_move(e) {
	if (!LP.t)
		return;

	var tt = e.touches && e.touches[0];
	if (!tt)
		return lp_cancel();

	var dx = tt.clientX - LP.x,
		dy = tt.clientY - LP.y;

	if (dx * dx + dy * dy > 36)
		lp_cancel();
}

function lp_fire() {
	LP.t = null;

	var f = item_by_key(LP.k);
	if (!f)
		return;

	// the whole point of the haptic: the mode opened while the finger was
	// still down, and there is no other signal that it did
	try { if (navigator.vibrate) navigator.vibrate(12); }
	catch (ex) { }

	sel_set(f, true);
	ST.selanchor = nm(f);

	// the browser still sends a click when the finger lifts, and that click
	// would navigate into the row the press just marked
	LP.eat = true;

	ST.selmode = true;
	sel_fx();
}

function lp_bind(on) {
	var el = ebi("nu_list");

	if (on) {
		// passive: the gesture never preventDefaults the touch stream, and
		// a non-passive touchmove on the scroller is a jank the whole list
		// pays for
		el.addEventListener("touchstart", lp_down, { passive: true });
		el.addEventListener("touchmove", lp_move, { passive: true });
		el.addEventListener("touchend", lp_cancel);
		el.addEventListener("touchcancel", lp_cancel);
	}
	else {
		el.removeEventListener("touchstart", lp_down);
		el.removeEventListener("touchmove", lp_move);
		el.removeEventListener("touchend", lp_cancel);
		el.removeEventListener("touchcancel", lp_cancel);
		lp_cancel();
	}
}

// -- the gesture stream ------------------------------------------------
//
// ONE pair of touch handlers for the drag gestures, on #nu_main, because
// the arbitration between them is an axis lock and an axis lock cannot be
// split across two listeners: the first move that clears GST_AX picks an
// axis and the gesture keeps it to the end. so a diagonal thumb does one
// thing, never both, and never neither.
//
// the long-press is NOT folded in here -- it is Card 5's, it lives on
// #nu_list, and it needs nothing from this: it already cancels itself on a
// 6px move, and any real swipe clears 6px long before it clears the 8px
// lock. the two are written against each other by that threshold and by
// LP.eat, which this reuses rather than minting a second click-swallow.
//
// installed only under CAP.coarse, from JS, with the same CAP.on() re-bind
// as the long-press and the right-click menu. a css-only gate would leave
// the listeners running for a mouse, which is the exact bug CAP exists for.

var GST_AX = 8;		// the axis lock: shorter than the long-press's own 6px
					// cancel, so a gesture that locks has already cancelled it

var SW_STEP = 84,	// one button (README:244)
	SW_SNAP = 60;	// release past this opens; short of it, it springs back

// `row` is the element under the finger THIS gesture, `open` is the element
// the last one left standing. they are different questions -- a tap on a
// second row while a first is open has both.
var SW = { row: null, k: null, max: 0, dx: 0, from: 0, open: null };

// `ax` is 0 until the lock, then 1 horizontal / 2 vertical
// `top` is answered ONCE, at touchstart: the pull is a thing you start at
// the top of the list, and re-asking mid-gesture would let a flick that
// coasted to the top turn into one halfway through.
var GST = { x: 0, y: 0, ax: 0, top: false };

var PULL_MAX = 72,		// the cap on the strip (README:246)
	PULL_TRIP = 48,	// past this the label flips, and a release refreshes
	PULL_HOLD = 900,	// the floor the "Refreshing…" state is held for
	PULL_RATE = 0.5;	// the finger travels twice as far as the strip

var PULL = { on: false, d: 0, busy: false };

function scroll_y() {
	if (typeof window.pageYOffset == "number")
		return window.pageYOffset;

	var de = document.documentElement;
	return (de && de.scrollTop) || (document.body && document.body.scrollTop) || 0;
}

// the strip is the FIRST child of #nu_main and it grows from 0, so it
// pushes the list down exactly as far as it is tall -- no transform, no
// second scroller, and nothing to undo if the gesture is abandoned.
var PULL_EL = null;

function pull_el() {
	if (PULL_EL)
		return PULL_EL;

	var el = document.createElement("div"),
		m = ebi("nu_main");

	el.id = "nu_pull";
	m.insertBefore(el, m.firstChild);
	return (PULL_EL = el);
}

function pull_fx(d, key) {
	var el = pull_el();
	PULL.d = d;
	el.style.height = d + "px";
	el.textContent = key ? t(key) : "";
}

function pull_up() {
	PULL.on = false;

	if (PULL.d <= PULL_TRIP)
		return pull_fx(0, null);

	// the 900ms is a FLOOR, not a delay. a LAN answers in single-digit
	// milliseconds, and a strip that appears and vanishes inside one frame
	// does not read as a refresh -- it reads as a glitch (README:246). so
	// both clocks run at once and the strip leaves when the LATER one is
	// done, which costs a slow server nothing.
	PULL.busy = true;
	pull_fx(PULL_TRIP, "nu_pl_busy");

	var ls = null, n = 0;

	function fin() {
		if (++n < 2)
			return;

		PULL.busy = false;
		pull_fx(0, null);

		// a failed refresh leaves the listing that is on screen alone: the
		// rows are still true, and blanking them would punish a dropped
		// packet with an empty folder
		if (ls)
			take(ls);
	}

	fetch_ls(location.pathname, function (err, r) {
		if (!err)
			ls = r;

		fin();
	});

	setTimeout(fin, PULL_HOLD);
}

// the track is created once and moved, never re-emitted per row: #nu_list
// is rewritten wholesale on every draw, so per-row markup would repaint
// two buttons for the ninety-nine rows nobody is touching. it mounts into
// #nu_main, which is not rewritten.
var SW_EL = null;

function sw_el() {
	if (SW_EL)
		return SW_EL;

	var el = document.createElement("div");
	el.id = "nu_swipe";
	el.hidden = true;
	el.onclick = sw_click;
	ebi("nu_main").appendChild(el);
	return (SW_EL = el);
}

// the same `show()` question the action bar asks: a server started
// --no-del has no business offering a Excluir button, so the track is 84px
// wide there and not 168px with a dead half.
function sw_acts() {
	var a = [["link", "nu_sw_link"]];

	if (srvcfg.have_del && perms && perms.indexOf("delete") + 1)
		a.push(["rm", "nu_a_rm"]);

	return a;
}

function sw_close() {
	if (SW.open) {
		SW.open.classList.remove("nu_drag");
		SW.open.style.transform = "";
	}

	if (SW_EL)
		SW_EL.hidden = true;

	SW.open = null;
	SW.dx = 0;
}

// the track goes where the row IS, measured off the same offsetParent the
// row is laid out in -- so it needs no knowledge of the header above the
// list, of the band, or of how far the page has scrolled.
function sw_place(row) {
	var el = sw_el(),
		acts = sw_acts(),
		h = [];

	for (var a = 0; a < acts.length; a++)
		h.push('<button type="button" class="nu_swb nu_sw_' + acts[a][0] +
			'" data-s="' + acts[a][0] + '">' + esc(t(acts[a][1])) + '</button>');

	el.innerHTML = h.join("");
	el.style.top = row.offsetTop + "px";
	el.style.height = row.offsetHeight + "px";
	el.hidden = false;

	return acts.length * SW_STEP;
}

function sw_click(e) {
	var b = e.target && e.target.closest ? e.target.closest(".nu_swb") : null;
	if (!b)
		return;

	var f = item_by_key(SW.k),
		k = b.getAttribute("data-s");

	// closed FIRST: both handlers below refresh the listing, and a track
	// still pointing at a row that is about to be re-rendered is a box
	// hovering over whatever row inherits that offset.
	sw_close();

	if (!f)
		return;

	if (k == "link")
		return copy_link(f);

	if (k == "rm")
		return rm_send([vp_of(f)]);
}

function gst_down(e) {
	SW.row = null;
	GST.ax = 0;

	// two fingers is a pinch, never a drag
	var tt = e.touches && e.touches.length == 1 ? e.touches[0] : null;
	if (!tt)
		return;

	var row = e.target && e.target.closest ?
		e.target.closest(".nu_row") : null;

	// the open row is NOT closed here. closing on touchstart would mean the
	// finger arriving at `Excluir` closes the track it came for -- and the
	// close belongs to the click anyway (see sel_click), where it can also
	// swallow the navigation.
	if (row && !row.classList.contains("nu_back"))
		SW.row = row;

	GST.x = tt.clientX;
	GST.y = tt.clientY;
	GST.top = scroll_y() <= 0;
}

function gst_move(e) {
	var tt = e.touches && e.touches[0];
	if (!tt)
		return gst_up();

	var dx = tt.clientX - GST.x,
		dy = tt.clientY - GST.y;

	if (!GST.ax) {
		if (Math.abs(dx) < GST_AX && Math.abs(dy) < GST_AX)
			return;

		GST.ax = Math.abs(dx) > Math.abs(dy) ? 1 : 2;

		if (GST.ax == 1) {
			// a row already open drags on from where it stands, so pulling
			// it shut is the same gesture backwards. every OTHER open row
			// closes: two open tracks would be two rows claiming the same
			// two buttons.
			SW.from = SW.open === SW.row ? SW.dx : 0;
			if (SW.open && SW.open !== SW.row)
				sw_close();

			// rightward off a closed row is not a swipe -- there is nothing
			// on that side to reveal
			if (!SW.row || (dx > 0 && !SW.from))
				return (SW.row = null);

			SW.k = SW.row.getAttribute("data-k");
			SW.max = sw_place(SW.row);
			SW.row.classList.add("nu_drag");
		}
		// DOWNWARDS and from the top of the list, and only those two -- a
		// drag from mid-list is the scroll the browser is already doing,
		// and an upwards one at the top is the same scroll in the other
		// direction. a refresh already running claims nothing.
		else if (GST.top && dy > 0 && !PULL.busy) {
			PULL.on = true;
			// the list is about to be redrawn under it
			sw_close();
		}
	}

	if (GST.ax == 2) {
		if (!PULL.on)
			return;

		// the reason this listener is not passive. `body` already carries
		// `overscroll-behavior-y: none`, which is what actually stops
		// chrome's own pull-to-refresh from firing over this one; this is
		// the belt for the platforms that property does not reach, and it
		// costs nothing on every gesture that is not a pull.
		if (e.cancelable !== false && e.preventDefault)
			e.preventDefault();

		return pull_fx(Math.min(dy * PULL_RATE, PULL_MAX),
			dy * PULL_RATE > PULL_TRIP ? "nu_pl_go" : "nu_pl_pull");
	}

	if (GST.ax != 1 || !SW.row)
		return;

	// clamped at both ends: the row never travels right of where it
	// started, and never past the last pixel of track there is to reveal
	SW.dx = Math.max(-SW.max, Math.min(0, SW.from + dx));
	SW.row.style.transform = "translateX(" + SW.dx + "px)";
}

function gst_up() {
	var row = SW.row,
		ax = GST.ax;

	SW.row = null;
	GST.ax = 0;

	if (PULL.on)
		return pull_up();

	// a gesture that locked VERTICAL never touched this row's transform, so
	// it must not decide anything about it -- least of all close a track
	// belonging to some other row entirely
	if (!row || ax != 1)
		return;

	// the transition comes back BEFORE the transform changes, which is the
	// whole spring: with the class still on, the snap would be a jump
	row.classList.remove("nu_drag");

	if (SW.dx > -SW_SNAP) {
		SW.open = row;		// so sw_close() has something to untranslate
		return sw_close();
	}

	SW.dx = -SW.max;
	SW.open = row;
	row.style.transform = "translateX(" + SW.dx + "px)";

	// the finger lifting off an opened row still sends a click, and that
	// click would navigate into the file the gesture just uncovered. the
	// same swallow the long-press uses -- one flag, one meaning: this touch
	// was a gesture, so the click it produced is not a tap.
	LP.eat = true;
}

function gst_bind(on) {
	var el = ebi("nu_main");

	if (on) {
		// the swipe needs no preventDefault at all -- `touch-action: pan-y`
		// in nu.css is what stops the sideways pan, declaratively and off
		// the main thread. the PULL does need one, and a listener cannot
		// ask for the right to preventDefault after the fact, so touchmove
		// is the one that is not passive. it spends it on nothing until a
		// pull is actually engaged.
		el.addEventListener("touchstart", gst_down, { passive: true });
		el.addEventListener("touchmove", gst_move, { passive: false });
		el.addEventListener("touchend", gst_up, { passive: true });
		el.addEventListener("touchcancel", gst_up, { passive: true });
	}
	else {
		el.removeEventListener("touchstart", gst_down);
		el.removeEventListener("touchmove", gst_move);
		el.removeEventListener("touchend", gst_up);
		el.removeEventListener("touchcancel", gst_up);
		SW.row = null;
		GST.ax = 0;
		PULL.on = false;
		sw_close();

		// only if it was ever built: a window that has never been coarse
		// gets no strip out of being told it is not coarse now
		if (PULL_EL)
			pull_fx(0, null);
	}
}

// -- render ------------------------------------------------------------

function render_chips() {
	var h = [];
	for (var a = 0; a < FILTERS.length; a++)
		h.push('<button type="button" class="nu_chip' +
			(FILTERS[a][0] == ST.filter ? " on" : "") +
			'" data-f="' + FILTERS[a][0] + '">' + esc(t(FILTERS[a][1])) + '</button>');

	ebi("nu_chips").innerHTML = h.join("");
}

function render_stat(shown) {
	var srt = ebi("nu_sort"), vw = ebi("nu_view");

	// selection mode relabels THESE TWO NODES and adds none of its own: the
	// design swaps the whole status line's contents (README:108-111), and a
	// second pair of buttons would have to be hidden, kept in sync and
	// placed twice -- once here and once in the wide band's grid, where
	// this row is the second column beside #nu_tools. #nu_sort keeps its
	// place in that row at both widths either way.
	if (ST.selmode) {
		ebi("nu_count").textContent = sel_n() + " " + t("nu_nsel");

		srt.textContent = t("nu_selall");
		srt.setAttribute("aria-label", t("nu_selall_t"));

		vw.textContent = t("nu_selinv");
		vw.setAttribute("aria-label", t("nu_selinv_t"));
		return;
	}

	// and the labels come back off again on the way out, or a screen reader
	// would read "Sort by name" as "select everything" for the rest of the
	// session
	srt.removeAttribute("aria-label");

	var sz = 0, n = shown.length;
	for (var a = 0; a < shown.length; a++)
		if (!isdir(shown[a]))
			sz += shown[a].sz || 0;

	var word = t(n == 1 ? "nu_item" : "nu_items");
	ebi("nu_count").textContent = n + " " + word + (sz ? " · " + humansize(sz) : "");

	srt.textContent = sort_label(ST.sortKey) + " " +
		(ST.sortDir > 0 ? "↑" : "↓");

	// the view control sits beside the sort button, and it is repainted in
	// the draw cycle for the same reason the sort arrow is: both are state,
	// and a control repainted only by the handler that flipped it drifts the
	// moment a second door flips the same preference -- and this one has
	// two, the ... router being the other.
	var g = pref("nu_grid");
	vw.textContent = t(g ? "nu_v_list" : "nu_v_grid");
	vw.setAttribute("aria-label", t(g ? "nu_v_list_t" : "nu_v_grid_t"));
}

function sort_label(k) {
	for (var a = 0; a < SORTS.length; a++)
		if (SORTS[a][0] == k)
			return t(SORTS[a][1]);

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
		// an EMPTY checkbox cell, not a missing one: the wide band places
		// every cell by name so a missing one would cost it nothing, but
		// the narrow band is a flex row and the back row would sit 30px
		// left of every other row the moment the mode opened.
		h.push('<a class="nu_row nu_dir nu_back" href="' + esc(keep(SR + "/" + up[0])) + '">' +
			'<span class="nu_ck"></span>' +
			'<span class="nu_type">DIR</span>' +
			'<span class="nu_meat"><span class="nu_name">' + esc(t("nu_back")) + '</span>' +
			'<span class="nu_sub"><span class="nu_n">' + esc(t("nu_back2")) +
			'</span></span></span>' +
			'<span class="nu_go">›</span></a>');
	}

	for (var a = 0; a < shown.length; a++) {
		var f = shown[a],
			d = isdir(f),
			k = kind_of(f),
			txt = chip_text(f),
			// the selection's key AND the row's identity: sel_click and
			// the long-press both read it back off the element, so the
			// dom never has to be matched against the listing by index.
			nk = nm(f),
			on = !!ST.sel[nk],
			nf = d ? nfiles(f) : null,
			// a folder's recursive size and its file count are filled by
			// one query in one tuple (httpcli.py, `select sz, nf from ds`),
			// so nfiles() is the predicate for "this row's sz is real".
			// cfg.idx is not: it is true on a nodirsz volume, where sz is
			// still the 4096 of the directory inode.
			sz = d
				? (nf === null ? "" : cell2("nu_c_sz",
					nf + " " + t(nf == 1 ? "nu_item" : "nu_items"), humansize(f.sz)))
				: cell("nu_c_sz", humansize(f.sz)),
			dt = cell2("nu_c_dt", dt_short(f), dt_long(f)),
			// files only: a folder's ext is "---", so ext_of() would fall
			// through to guessing from the name and label `my.backup` as
			// a backup. a file with no extension gets no cell either.
			ty = d ? "" : cell("nu_c_ty", ext_of(f));

		h.push('<a class="nu_row ' + (d ? "nu_dir" : "nu_file") +
			(on ? " nu_on" : "") + '" data-k="' + esc(nk) +
			'" href="' + esc(d ? keep(f.href) : f.href) + '">' +
			// the CONTAINER is what the css animates from 0 to 30px, so it
			// is emitted at every width and in both states; the circle
			// inside it only ever changes class.
			'<span class="nu_ck"><span class="nu_cb' + (on ? " on" : "") +
			'"></span></span>' +
			'<span class="nu_type' + (k && k != "dir" ? " nu_t_" + k : "") +
			(txt.length > 3 ? " nu_long" : "") + '">' + txt + '</span>' +
			'<span class="nu_meat">' +
			'<span class="nu_name">' + esc(nm(f)) + '</span>' +
			'<span class="nu_sub">' + sz + dt + ty + '</span></span>' +
			(d ? '<span class="nu_go">›</span>' : '') + '</a>');
	}

	if (!shown.length)
		h.push('<p class="nu_empty">' +
			esc(t(ST.q || ST.filter != "all" ? "nu_nomatch" : "nu_empty")) +
			'</p>');

	ebi("nu_list").innerHTML = h.join("");
}

// -- thumbnails --------------------------------------------------------
//
// spec 0001 D7: there is NOTHING here to negotiate with the server. `?th=`
// carries the format in the parameter and the client picks it from its own
// decode probes, exactly as the classic UI does (browser.js:5873-5878).
//
// which leaves ONE trap, and it is the reason the onerror below is not the
// thumbless detector it looks like: on a `--no-thumb` volume `?th=` answers
// **200** with a served icon (tx_ico, httpcli.py:7133 -- tx_svg("folder")
// for a coverless directory, :7113), and 200 with an error svg when a
// conversion fails (:7120-7122). only `th=p` 404s and only the audio codes
// 415, and nothing here asks for either. so a broken-image box is not a
// state the server can put a tile in; onerror is for genuine transport
// failure, and it falls back to the tile's own placeholder fill.

// null until the probe answers -- the same three states browser.js keeps,
// where `have_webp === null` is what loadgrid waits on (:5821). the keys
// are the classic UI's, in the flat localStorage namespace nu shares with
// it, so a user who has already probed over there does not probe again.
var have_webp = null,
	have_jxl = null,
	// set by render_grid when it drew a tile with NO <img> because the
	// probe had not answered yet. the probe's callback then redraws exactly
	// once -- which is the point: a tile that guessed jpeg now and asked
	// for webp a moment later would fetch every thumbnail twice.
	TH_WAIT = false;

function probe_img(fmt, uri) {
	var k = "have_" + fmt,
		v = sget(k);

	if (v !== null)
		return set_probe(fmt, !!v);

	var img = new Image();
	img.onload = function () {
		var got = img.width > 0 && img.height > 0;
		sset(k, got ? "ya" : "");
		set_probe(fmt, got);
	};
	img.onerror = function () {
		sset(k, "");
		set_probe(fmt, false);
	};
	img.src = uri;
}

function set_probe(fmt, v) {
	if (fmt == "jxl")
		have_jxl = v;
	else
		have_webp = v;

	if (TH_WAIT && th_fmt()) {
		TH_WAIT = false;
		draw();
	}
}

// null is "not yet", which is emphatically not "no thumbnails": one makes
// the tile wait for one redraw, the other never asks at all.
function th_fmt() {
	if (have_jxl === null || have_webp === null)
		return null;

	return have_jxl ? "x" : have_webp ? "w" : "j";
}

// a forced volflag is not a preference, so these two questions are asked
// here and not through pref() alone
function want_crop() {
	return vforced("dcrop") ? vdef("dcrop") : pref("gridcrop");
}

function want_x3() {
	return vforced("dth3x") ? vdef("dth3x") : pref("grid3x");
}

// the admin's per-extension icon overrides (`ext_th`, authsrv.py:3302),
// consulted BEFORE any thumb request exactly as browser.js:5870-5872 does:
// an admin who pinned an icon to an extension meant it, and asking the
// thumbnailer first would race them for the same tile.
//
// keyed the way browser.js:5851-5868 keys it -- up to two trailing name
// components of at most 7 chars each, so "tar.gz" is a key, with the last
// component alone as the fallback. the decoded name is what is split, not
// the href: an escape in the url would not match a key an admin typed.
function ext_th(f) {
	var m = srvcfg.ext_th;
	if (!m)
		return "";

	var ar = nm(f).split(".");
	ar.shift();
	ar.reverse();

	var e0 = ar.length ? ar[0] : "",
		e = "";

	for (var a = 0; a < Math.min(2, ar.length); a++) {
		if (ar[a].length > 7)
			break;

		e = e ? (ar[a] + "." + e) : ar[a];
	}

	return m[e || "unk"] || (e0 && m[e0]) || "";
}

// "" -- this tile asks for no thumbnail at all;
// null -- ask again once the probe answers.
function th_src(f) {
	if (!pref("thumbs"))
		return "";

	var u = ext_th(f);
	if (u)
		return u;

	var fmt = th_fmt();
	if (!fmt)
		return null;

	// built on the file's OWN href, which already carries the dirkey or the
	// filekey where the volume needs one -- a url rebuilt from the name
	// would drop it and every tile on a dk volume would 403.
	//
	// `f` when not cropping and `3` on hi-dpi are the same two suffixes
	// browser.js:5879-5882 appends, and `cache=i&_=` is its cache key
	// (:5900). the classic UI also appends `&raster` on chrome, for the
	// ~2000-unique-svg limit that bites only the served-icon fallback; nu
	// carries no useragent sniff and is not growing one for it.
	var h = f.href;
	return h + (h.indexOf("?") < 0 ? "?" : "&") + "th=" + fmt +
		(want_crop() ? "" : "f") + (want_x3() ? "3" : "") +
		"&cache=i&_=" + TS;
}

// genuine transport failure only -- see the trap above. dropping the <img>
// uncovers the tile's own placeholder fill, which is already the design's
// behaviour for a file with no preview, so there is no second markup and
// no second state to keep.
function th_dead() {
	if (this.parentNode)
		this.parentNode.removeChild(this);
}

// -- the grid ----------------------------------------------------------
//
// the ONE sanctioned exception to "one markup, one renderer"
// (docs/nu-ui.md:88-92, spec 0002 D5): grid view is a different
// PRESENTATION of the data, not a different width of the same presentation,
// so it earns a renderer and nothing else does. three rules keep the
// exception from spreading:
//
// * it is FED, never sourced -- draw() hands it the same filtered() output
//   render_list gets, so there is one data path, one sort and one filter;
// * it introduces no second ROW markup. a tile is not a narrow row; the
//   list's `.nu_row` is untouched by everything below;
// * draw() stays the single caller, and #nu_list the single container --
//   after this file there are exactly three writers of that innerHTML.
//
// the tile is 114 x 114 (README:144-155) and the geometry lives in nu.css;
// what is decided here is only which classes the tile carries, because the
// placeholder fill is per KIND and the extension badge is the same
// chip_text() the list's type chip is built from -- one source for the
// word, two boxes for it.
function render_grid(shown) {
	var h = [];

	// the same door out the list draws, for the same reason: the header's
	// #nu_up is the other one, and a view is a preference -- flipping it
	// must not quietly remove an affordance.
	if (vpnodes.length > 1) {
		var up = vpnodes[vpnodes.length - 2];
		h.push('<a class="nu_tile nu_dir nu_back" href="' +
			esc(keep(SR + "/" + up[0])) + '">' +
			'<span class="nu_tb">‹</span>' +
			'<span class="nu_tk"></span>' +
			'<span class="nu_tn">' + esc(t("nu_back")) + '</span></a>');
	}

	// cleared here and re-armed per tile: whether the grid is waiting on the
	// probe is a fact about THIS draw, not a latch
	TH_WAIT = false;

	for (var a = 0; a < shown.length; a++) {
		var f = shown[a],
			d = isdir(f),
			k = kind_of(f),
			nk = nm(f),
			on = !!ST.sel[nk],
			th = th_src(f);

		if (th === null)
			TH_WAIT = true;

		h.push('<a class="nu_tile ' + (d ? "nu_dir" : "nu_file") +
			(k && k != "dir" ? " nu_k_" + k : "") + (on ? " nu_on" : "") +
			'" data-k="' + esc(nk) +
			'" href="' + esc(d ? keep(f.href) : f.href) + '">' +
			// the thumbnail sits UNDER the badge and the name, over the
			// placeholder fill; alt is empty because the name is already
			// on the tile as text and a screen reader must not read it
			// twice. .nu_tfit follows the `f` in the url -- the server was
			// asked to fit rather than crop, so the css may not crop it.
			(th ? '<img class="nu_ti' + (want_crop() ? "" : " nu_tfit") +
				'" alt="" src="' + esc(th) + '">' : "") +
			// chip_text() emits a bare entity for "no extension", exactly
			// as it does for the list's chip, so this is not escaped there
			// either
			'<span class="nu_tb">' + chip_text(f) + '</span>' +
			// the top-right slot's 22px checkbox (README:151-152).
			// `.nu_tk:empty` is display:none, the same trick #nu_tools
			// uses, so outside the mode the slot costs no box -- which is
			// why a tile's checkbox is emitted on the MODE and the list's
			// is emitted always: the list animates a width and a tile
			// has nothing to animate, it is an overlay on a thumbnail.
			'<span class="nu_tk">' + (ST.selmode ?
				'<span class="nu_cb' + (on ? " on" : "") + '"></span>' : "") +
			'</span>' +
			'<span class="nu_tn">' + esc(nm(f)) + '</span></a>');
	}

	if (!shown.length)
		h.push('<p class="nu_empty">' +
			esc(t(ST.q || ST.filter != "all" ? "nu_nomatch" : "nu_empty")) +
			'</p>');

	ebi("nu_list").innerHTML = h.join("");

	// the fallback is attached as a PROPERTY and never as an inline
	// attribute: nu is servable under a Content-Security-Policy, and an
	// `onerror=` built into innerHTML is exactly what such a policy drops --
	// the same reason the settings swatch carries a data attribute instead
	// of a style attribute.
	var im = ebi("nu_list").querySelectorAll("img.nu_ti");
	for (var b = 0; b < im.length; b++)
		im[b].onerror = th_dead;
}

// the view flips two things and they have to move together: the attribute
// the css bands read, and the renderer draw() picks. apply_prefs owns the
// attribute -- it is where every presentation preference on <html> is
// written, and writing it there is also what makes the view survive a
// reload without a flash of the other one.
function view_fx() {
	apply_prefs();
	draw();
}

function set_view(v) {
	setpref("nu_grid", v);
	view_fx();
}

function draw() {
	// the swipe cannot survive the repaint: #nu_list is rewritten below, so
	// the row the track was measured against is about to stop existing, and
	// a track left behind would sit over whichever row inherits its offset.
	sw_close();

	var shown = filtered();
	render_stat(shown);
	// beside render_stat, and NOT bolted into pick_sort(): the arrow is
	// state, and repainting it in the draw cycle is what keeps the header
	// and the sheet from drifting out of agreement.
	render_head();
	// the only branch in the file that picks a renderer, and it picks from
	// the preference rather than from a width: the grid is a view, not a
	// band, and a resize must never change which of these runs.
	(pref("nu_grid") ? render_grid : render_list)(shown);
}

// -- sort sheet --------------------------------------------------------

function render_sheet() {
	var h = [];
	for (var a = 0; a < SORTS.length; a++) {
		var s = SORTS[a], on = s[0] == ST.sortKey;
		h.push('<button type="button" class="nu_sopt' + (on ? " on" : "") +
			'" data-k="' + s[0] + '">' +
			'<span class="nu_slab">' + esc(t(s[1])) + '</span>' +
			'<span class="nu_shnt">' + esc(t(s[2])) + '</span>' +
			'<span class="nu_sdir">' + (on ? (ST.sortDir > 0 ? "↑" : "↓") : "") +
			'</span></button>');
	}
	ebi("nu_sopts").innerHTML = h.join("");
}

// -- the sheet machinery -----------------------------------------------
//
// one veil, at most one open sheet, N tenants: the sort sheet is the first
// and 0001's `...` router is the second. a tenant is an element id plus a
// renderer, and nothing below this line knows which sheet it is moving.
//
// a renderer is optional -- a sheet whose markup is static registers null
// and still gets the veil, the transition and the Escape handling.

var SHEETS = {
	nu_sheet: render_sheet,
	nu_menu: render_menu,
	nu_cfg: render_cfg,
	nu_tsh: render_tsh
};

function sheet(id, on) {
	var s = ebi(id), v = ebi("nu_veil");
	if (!s)
		return;

	if (on) {
		// two sheets over one veil would leave the loser sitting behind it,
		// so opening one closes whatever else is open first. this recurses
		// exactly once: the inner call takes the else branch.
		if (ST.sheet && ST.sheet != id)
			sheet(ST.sheet, false);

		ST.sheet = id;

		var r = SHEETS[id];
		if (r)
			r();

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
		if (ST.sheet == id)
			ST.sheet = null;

		s.classList.remove("on");
		v.classList.remove("on");
		setTimeout(function () {
			// the teardown asks about THIS sheet, not about sheets in
			// general: something opened inside the 280ms window -- this one
			// reopened, or another one opened over it -- would otherwise be
			// hidden by its predecessor's timer, visibly, a third of a
			// second after the tap that opened it.
			if (ST.sheet != id)
				s.hidden = true;

			// the veil is shared, so it goes only when nothing is left
			if (!ST.sheet)
				v.hidden = true;
		}, 280);
	}
}

// -- the action bar ----------------------------------------------------
//
// ONE component, TWO placements (spec 0002 D5): the fixed bar below 64em,
// and the #nu_tools slot in the status line at and above it. one render,
// one table of keys, one set of handlers. a second bar with its own strings
// is the failure 0002 declared #nu_tools against, and it is a failure that
// only shows up as drift months later, so it is worth saying twice.
//
//   [ key, label key, aria-label key or null, show(), live(), do() ]
//
// `show` and `live` are different questions and upload is why. `show` says
// whether the button exists at all -- a user without write has no business
// being offered mkdir. `live` says only whether it LOOKS available: the
// handler runs either way, because a dead button that cannot be tapped
// cannot explain itself, which is the whole of spec 0001 D2.

var ACTS = [
	["up", "nu_a_up", null,
		function () { return true; },
		function () { return false; },
		function () {
			// upload is out to its own spec (D2): up2k.js is not a library,
			// it drives ~47 specific element ids. until that spec lands the
			// honest state is a visibly dead button that routes to the UI
			// where uploading works -- not a hidden one that makes this look
			// finished.
			location.href = location.pathname + "?nu0";
		}],

	["mkdir", "nu_a_mkdir", null,
		function () { return !!(perms && perms.indexOf("write") + 1); },
		function () { return true; },
		act_mkdir],

	["more", "nu_a_more", "nu_a_more_t",
		function () { return true; },
		function () { return true; },
		function () { sheet("nu_menu", true); }]
];

// the selection slot set. the SAME component, the same two placements and
// the same table shape as ACTS -- render_acts picks between them from the
// mode, so nothing below this line knows there are two, and neither
// placement gets a string, a class or a handler of its own (spec 0002 D5).
//
// `Baixar` reuses ctx_dl, the word 0002's right-click menu already ships
// translated. `Mover` is DECLARED and dead: one request per selected item,
// and a folder source is a long abortable server-side walk (up2k.py:4625),
// so the flow needs progress and cancellation and is deferred -- tapping it
// says so, which is what the `live` column is for (see ACTS above).
var SACTS = [
	["dl", "ctx_dl", null,
		function () { return !!srvcfg.have_zip; },
		function () { return sel_n() > 0; },
		act_dl],

	["mv", "nu_a_mv", null,
		function () {
			return !!srvcfg.have_mv && !!(perms && perms.indexOf("move") + 1);
		},
		function () { return false; },
		function () { alert(t("nu_mv_soon")); }],

	["rm", "nu_a_rm", null,
		// a server started --no-del has have_del false, so the button is
		// not rendered at all -- not rendered dead. spec 0001 D2's dead
		// button is for a thing this UI has not built yet; a thing the
		// SERVER refuses is not a nu gap and must not look like one.
		function () {
			return !!srvcfg.have_del && !!(perms && perms.indexOf("delete") + 1);
		},
		function () { return sel_n() > 0; },
		act_rm]
];

function render_acts() {
	var el = ebi(CAP.wide ? "nu_tools" : "nu_bar"),
		off = ebi(CAP.wide ? "nu_bar" : "nu_tools"),
		acts = ST.selmode ? SACTS : ACTS,
		h = [];

	// the container that is not the current placement is EMPTIED, never
	// hidden: both :empty rules in nu.css key on content, so an emptied
	// #nu_tools costs no box in #nu_acts' flex gap at phone width, and an
	// emptied #nu_bar paints no strip of blur at 1440px.
	off.innerHTML = "";

	for (var a = 0; a < acts.length; a++) {
		var c = acts[a], live = false;

		try { if (!c[3]()) continue; }
		catch (ex) { continue; }

		try { live = !!c[4](); }
		catch (ex) { }

		h.push('<button type="button" class="nu_act nu_a_' + c[0] +
			'" data-a="' + esc(c[0]) + '"' +
			(c[2] ? ' aria-label="' + esc(t(c[2])) + '"' : "") +
			// aria-disabled, never the disabled attribute: a disabled button
			// emits no click event at all, and this bar's dead button has to
			// be tappable to say what it is waiting for.
			(live ? "" : ' aria-disabled="true"') + '>' +
			esc(t(c[1])) + '</button>');
	}

	el.innerHTML = h.join("");
}

function act_click(e) {
	var b = e.target && e.target.closest ? e.target.closest(".nu_act") : null;
	if (!b)
		return;

	var k = b.getAttribute("data-a"),
		acts = ST.selmode ? SACTS : ACTS;

	for (var a = 0; a < acts.length; a++)
		if (acts[a][0] == k)
			return acts[a][5](b);
}

// a FORM, not an xhr: an xhr would pull the archive into memory and hand
// the user nothing. `POST <vpath>?zip[&k=]`, multipart, target=_blank, with
// the selected BASENAMES newline-separated -- the classic UI's own shape
// (browser.js:8891-8919) and what handle_zip_post reads (httpcli.py:3125).
//
// the names go on the wire ENCODED, exactly as the listing spelled them,
// because that end unquotep()s them; vp_of's decoded form is the other
// endpoint's. a folder in the list is archived recursively, which is what
// makes one door enough for both kinds of row.
function act_dl() {
	var sel = sel_list();
	if (!sel.length)
		return;

	// the folder's own dirkey, if we arrived here through one: `?zip` is
	// gated on the same key the listing was (_use_dirkey), so a dk visitor
	// who cannot pass it along gets a 403 on a listing they can see.
	var k = /[?&]k=([^&#]*)/.exec(location.search),
		txt = [];

	for (var a = 0; a < sel.length; a++)
		txt.push(sel[a].href.split("?")[0].replace(/\/$/, ""));

	ebi("nu_zip").setAttribute("action",
		location.pathname + "?zip" + (k ? "&k=" + k[1] : ""));

	ebi("nu_zipf").value = txt.join("\n");
	ebi("nu_zip").submit();
}

// ONE request, and that is the decision: the classic UI walks the
// selection with one POST per file (browser.js:4596-4623) so it can toast
// per name, and N mis-taps then cost N round trips. `?delete` already
// takes a LIST -- handle_rm's `req` is the parsed json body
// (httpcli.py:3190) and up2k.handle_rm loops it server-side -- so nu posts
// the whole selection once and refreshes.
//
// spec 0001 D6: one file swiped away costs two deliberate acts and needs
// no dialog; N files destroyed by one 48px button do, and the dialog names
// the count.
function act_rm() {
	var sel = sel_list(),
		n = sel.length;

	if (!n)
		return;

	var what = n + " " + t(n == 1 ? "nu_item" : "nu_items");
	try {
		if (!confirm(t("nu_rm_ask").replace("%", what)))
			return;
	}
	catch (ex) { return; }

	var vps = [];
	for (var a = 0; a < sel.length; a++)
		vps.push(vp_of(sel[a]));

	rm_send(vps);
}

// the WIRE half, and the dialog is deliberately not in it: spec 0001 D6
// gives one swiped file no dialog and N selected files one, so the question
// belongs to whoever asked and the request does not. three callers -- the
// selection bar above, the swipe's `Excluir`, and the right-click row --
// and one POST between them.
function rm_send(vps) {
	var xhr = new XMLHttpRequest();
	xhr.open("POST", location.pathname + "?delete", true);
	// text/plain, not application/json: handle_post_json accepts either
	// (httpcli.py:2472-2477) and text/plain is not a cors preflight, so a
	// reverse-proxied deployment has one fewer request to get wrong.
	xhr.setRequestHeader("Content-Type", "text/plain");
	xhr.onloadend = function () {
		if (this.status != 200)
			return alert(t("nu_rm_err") + " (HTTP " + this.status + ")");

		// out of the mode first: the rows it was holding no longer exist,
		// and take() prunes what is left of the selection anyway
		set_sel(false);

		fetch_ls(location.pathname, function (err, ls) {
			if (!err)
				take(ls);
		});
	};
	xhr.send(JSON.stringify(vps));
}

// the same request the classic UI makes (browser.js:8998-9010): multipart
// `act=mkdir` + `name`, posted at the folder we are standing in, which is
// what handle_mkdir() joins the name onto (httpcli.py:3736-3741). _mkdir()
// answers `redirect(vpath, status=201)`, and 405 is "already exists" --
// for a listing that wants refreshing those are the same outcome.
function act_mkdir() {
	var name = null;
	try { name = prompt(t("nu_mk_ask")); }
	catch (ex) { }

	if (!name)
		return;

	var fd = new FormData();
	fd.append("act", "mkdir");
	fd.append("name", name);

	var xhr = new XMLHttpRequest();
	xhr.open("POST", location.pathname, true);
	xhr.onloadend = function () {
		if (this.status != 201 && this.status != 405)
			return alert(t("nu_mk_err") + " (HTTP " + this.status + ")");

		// fetch_ls is callback-only -- it does not call take() itself
		fetch_ls(location.pathname, function (err, ls) {
			if (!err)
				take(ls);
		});
	};
	xhr.send(fd);
}

// -- the ... router ----------------------------------------------------
//
// NOT a list of four items. spec 0001 D1 decided that the classic UI is
// scaffolding and nu is aiming at parity, which makes this sheet the only
// door nu will ever have for every surface the design never drew -- the
// control panel, the admin panel, the shares list, whatever comes after.
// so it is a table, in the same shape as 0002's CTX (nu.js:604-618), and a
// later spec adds a ROW rather than redesigning the sheet.
//
//   section:  [ label key, rows ]
//   row:      [ key, label key, meta key or null, ok(), do() or null ]
//
// `ok()` is the capability gate -- srvcfg and perms -- and a row it refuses
// is not rendered at all, because a server that cannot do the thing should
// not list it. `do` null is the other state: DECLARED, rendered, and
// disabled. spec 0001 defers all of these but Settings (card 2) and the
// classic-UI row below, and they are written out now so the router's shape
// is right the first time and a later spec lands one handler.

var MENU = [
	["nu_m_here", [
		// the mirror of the status line's view control -- the same
		// preference and the same set_view(), never a second toggle. its
		// meta names the view you are in NOW, so the row reads as the
		// settings row it is; that answer changes after the table is built,
		// which is why it is a function returning a key, for the same
		// reason PREFS' `d` is a function and not a value.
		["view", "nu_m_view",
			function () { return pref("nu_grid") ? "nu_v_grid" : "nu_v_list"; },
			function () { return true; },
			function () { set_view(!pref("nu_grid")); }],

		["newmd", "nu_m_newmd", null,
			function () { return !!(perms && perms.indexOf("write") + 1); },
			null],

		["msg", "nu_m_msg", null,
			function () { return !!srvcfg.have_emp; },
			null],

		["unpost", "nu_m_unpost", "nu_m_unpost_m",
			function () { return !!srvcfg.have_unpost; },
			null]
	]],

	["nu_m_srv", [
		["rups", "nu_m_rups", null,
			function () { return !!srvcfg.have_up2k_idx; },
			null],

		["shr", "nu_m_shr", null,
			function () { return !!srvcfg.have_shr; },
			null],

		// the router's first live row, and the reason it was written as a
		// table: nothing here was redesigned to add it, one `null` became
		// one handler
		["cfg", "nu_m_cfg", "nu_m_cfg_m",
			function () { return true; },
			function () { sheet("nu_cfg", true); }],

		// --ui-nocpla is the admin's existing switch for exactly this link
		// (browser.js:1299 hides #goh on it), so nu reads it rather than
		// inventing a second one
		["cpa", "nu_m_cpa", "nu_m_cpa_m",
			function () { return !srvcfg.ui_nocpla; },
			null],

		["old", "nu_m_old", null,
			function () { return true; },
			function () {
				// the escape hatch that used to be the nav bar's right slot,
				// moved here as a HANDLER and not as a relocated element: the
				// sheet renders from this table, so a boot-time onclick bound
				// to a node would be destroyed on the first re-render.
				//
				// same logic it always had: the classic UI strips the query
				// from the address bar, so a bare ?nu0 does not survive a
				// reload and leaving has to unpin the cookie instead. see
				// docs/nu-ui.md:26-32. 0002's ctx_old row navigates to ?nu0 on
				// its own and never read #nu_old, so it is unaffected -- it is
				// an accelerator, and this row is the visible door it
				// accelerates.
				if (STICKY)
					return unpin();

				location.href = location.pathname + "?nu0";
			}]
	]]
];

function menu_row(k) {
	for (var a = 0; a < MENU.length; a++) {
		var rows = MENU[a][1];
		for (var b = 0; b < rows.length; b++)
			if (rows[b][0] == k)
				return rows[b];
	}
	return null;
}

// a row's label and meta are KEYS, and either may be a function returning
// one. the sheet is re-rendered every time it opens, so a row mirroring a
// preference can answer with today's word instead of the one the table was
// built with.
function mkey(v) {
	return t(typeof v == "function" ? v() : v);
}

function render_menu() {
	var h = [];

	for (var a = 0; a < MENU.length; a++) {
		var sec = MENU[a], rows = [];

		for (var b = 0; b < sec[1].length; b++) {
			var m = sec[1][b], ok = false;
			try { ok = !!m[3](); }
			catch (ex) { }

			if (!ok)
				continue;

			rows.push('<button type="button" class="nu_mrow" data-m="' +
				esc(m[0]) + '"' + (m[4] ? "" : " disabled") + '>' +
				'<span class="nu_mlab">' + esc(mkey(m[1])) + '</span>' +
				(m[2] ? '<span class="nu_mmeta">' + esc(mkey(m[2])) + '</span>' : "") +
				'<span class="nu_mgo">\u203a</span></button>');
		}

		// a section every row of which the server gated away prints no
		// header either -- an empty "SERVER" heading is worse than no
		// heading, it reads as a rendering bug
		if (rows.length)
			h.push('<h3 class="nu_mh">' + esc(t(sec[0])) + '</h3>' +
				rows.join(""));
	}

	ebi("nu_mopts").innerHTML = h.join("");
}

// -- the settings screen -----------------------------------------------
//
// the design's four groups, in its order (README:206-211), plus the two
// additions this spec names as additions: a Densidade row in Exibição and a
// Tema row in Aparência. a table again, for the same reason the router is
// one -- card 3 adds crop and 3x to Exibição by adding two lines here.
//
//   group: [ label key, rows ]
//   row:   [ kind, key, label key, sub key or null, ok(), options ]
//
// kinds:
//   tgl   a boolean preference; the whole 52px row is the target
//   seg   a segmented enum, [value, label key] pairs
//   acc   the accent swatches, [hue, label key] pairs
//   lang  the language select -- a cookie, not a preference
//   dead  declared, rendered, and disabled
//
// `ok()` gates a row away ENTIRELY rather than disabling it: a user without
// udot cannot be given a hidden-files switch that would do nothing, because
// a dead switch cannot explain why (spec 0001 D3). `dead` is the other
// state, and it is for surfaces this spec defers on purpose -- a row that
// says "not yet" is honest; a missing row reads as finished.

var yep = function () { return true; };

var CFG = [
	["nu_c_disp", [
		["tgl", "dotfiles", "nu_c_dots", "nu_c_dots_s", can_dot],
		["tgl", "dir1st", "nu_c_dir1st", null, yep],
		["tgl", "nsort", "nu_c_nsort", "nu_c_nsort_s", yep],
		["tgl", "thumbs", "nu_c_thumbs", null, yep],
		["tgl", "nu_grid", "nu_c_grid", null, yep],
		// the design's five, then this spec's additions. crop and 3x are
		// gated on the VOLFLAG and not on a capability: where the admin
		// forced the answer there is nothing for a switch to do, and a
		// switch that does nothing cannot say why (spec 0001 D3).
		["tgl", "gridcrop", "nu_c_crop", "nu_c_crop_s",
			function () { return !vforced("dcrop"); }],
		["tgl", "grid3x", "nu_c_3x", "nu_c_3x_s",
			function () { return !vforced("dth3x"); }],
		["tgl", "nu_dens", "nu_c_dens", "nu_c_dens_s", yep]
	]],

	["nu_c_size", [
		["seg", "nu_szfmt", "nu_c_szfmt", null, yep, [
			["auto", "nu_c_sz_a"],
			["si", "nu_c_sz_d"],
			["iec", "nu_c_sz_b"]]]
	]],

	["nu_c_look", [
		// the four hues share the palette's lightness and chroma; only the
		// hue changes, which is the whole of "trocar acento não deve exigir
		// mais nada" (README:297-298)
		["acc", "nu_acch", "nu_c_acc", null, yep, [
			["300", "nu_c_a300"],
			["250", "nu_c_a250"],
			["160", "nu_c_a160"],
			["60", "nu_c_a60"]]],

		["seg", "nu_thm", "nu_c_thm", null, yep, [
			["light", "nu_c_thm_l"],
			["dark", "nu_c_thm_d"],
			// the empty value is `system`, and it is stored by REMOVING the
			// key -- see setpref. all three states are already in nu.css.
			["", "nu_c_thm_a"]]]
	]],

	["nu_c_acct", [
		["lang", "lang", "nu_c_lang", null, yep],
		["dead", "cpa", "nu_m_cpa", "nu_c_soon",
			function () { return !srvcfg.ui_nocpla; }],
		["dead", "out", "nu_c_out", "nu_c_soon", yep]
	]]
];

// the languages the server ships a tl file for (copyparty/__init__.py's
// manifest, and browser.js:687-711 holds the same table for the classic UI
// -- nu does not load browser.js). endonyms, so the list is legible in the
// language it offers. every code is three characters, which is what lets
// this be one string instead of 23 array literals.
var LANGN = ("eng English|nor Norsk|chi 中文|cze Čeština|" +
	"deu Deutsch|epo Esperanto|fin Suomi|fra français|" +
	"grc Ελληνικά|hun Magyar|" +
	"ita Italiano|jpn 日本語|kor 한국어|" +
	"nld Nederlands|nno Nynorsk|pol Polski|por Português|" +
	"rus Русский|spa Español|" +
	"swe Svenska|tur Türkçe|" +
	"ukr Українська|" +
	"vie Tiếng Việt").split("|");

function cfg_row(k) {
	for (var a = 0; a < CFG.length; a++) {
		var rows = CFG[a][1];
		for (var b = 0; b < rows.length; b++)
			if (rows[b][1] == k)
				return rows[b];
	}
	return null;
}

function cfg_lab(m) {
	return '<span class="nu_clab"><span class="nu_cl">' + esc(t(m[2])) +
		'</span>' + (m[3] ? '<span class="nu_cs">' + esc(t(m[3])) +
			'</span>' : "") + '</span>';
}

function cfg_ctrl(m) {
	var k = m[1], h = [], a, o;

	if (m[0] == "seg" || m[0] == "acc") {
		var cur = pref(k),
			seg = m[0] == "seg",
			cls = seg ? "nu_copt" : "nu_swa";

		for (a = 0; a < m[5].length; a++) {
			o = m[5][a];
			h.push('<button type="button" class="' + cls +
				(o[0] === cur ? " on" : "") + '" data-c="' + esc(k) +
				'" data-v="' + esc(o[0]) + '"' +
				// the swatch has no text, so its name has to be its label
				(seg ? "" : ' aria-label="' + esc(t(o[1])) + '"') +
				' aria-pressed="' + (o[0] === cur ? "true" : "false") + '">' +
				(seg ? esc(t(o[1])) : "") + '</button>');
		}

		return '<span class="' + (seg ? "nu_seg" : "nu_swz") + '">' +
			h.join("") + '</span>';
	}

	if (m[0] == "lang") {
		for (a = 0; a < LANGN.length; a++) {
			var code = LANGN[a].slice(0, 3);
			h.push('<option value="' + esc(code) + '"' +
				(code == lang ? " selected" : "") + '>' +
				esc(LANGN[a].slice(4)) + '</option>');
		}
		return '<select id="nu_clang" class="nu_csel">' + h.join("") +
			'</select>';
	}

	// tgl. aria-checked lives on the ROW, which is the button; the switch
	// itself is decoration and must not be a second control in the tab order.
	return '<span class="nu_tgl' + (pref(k) ? " on" : "") +
		'"><span class="nu_knob"></span></span>';
}

function render_cfg() {
	var h = [];

	for (var a = 0; a < CFG.length; a++) {
		var sec = CFG[a], rows = [];

		for (var b = 0; b < sec[1].length; b++) {
			var m = sec[1][b], ok = false;
			try { ok = !!m[4](); }
			catch (ex) { }

			if (!ok)
				continue;

			var tgl = m[0] == "tgl",
				dead = m[0] == "dead";

			rows.push('<' + (tgl ? "button" : "div") + ' class="nu_crow"' +
				(tgl ? ' type="button" role="switch" data-c="' + esc(m[1]) +
					'" aria-checked="' + (pref(m[1]) ? "true" : "false") + '"'
					: "") + (dead ? " disabled" : "") + '>' +
				cfg_lab(m) + (dead ? "" : cfg_ctrl(m)) +
				'</' + (tgl ? "button" : "div") + '>');
		}

		// same rule as the router: a group whose every row was gated away
		// prints no header either
		if (rows.length)
			h.push('<h3 class="nu_cgh">' + esc(t(sec[0])) + '</h3>' +
				'<div class="nu_ccard">' + rows.join("") + '</div>');
	}

	ebi("nu_cfgb").innerHTML = h.join("");

	var sel = ebi("nu_clang");
	if (sel)
		sel.onchange = function () {
			// the language is a server cookie, not a preference: httpcli
			// resolves `lang` from cplng before the template is rendered
			// (:344), so the strings can only change on the next load.
			setck("cplng=" + this.value, function () { location.reload(); });
		};
}

// what a flipped preference has to invalidate. a table and not a switch
// inside the click handler, for the same reason as everything else in this
// file: card 3's grid and card 4's tree sheet add a key here.
var PREF_FX = {
	dir1st: draw,
	nsort: draw,
	thumbs: draw,
	// the view needs the attribute rewritten before the redraw, not just the
	// redraw: the container's layout and the column header are css reading
	// <html>, so a draw() alone would put tiles inside a list container.
	nu_grid: view_fx,
	// both only ever change a url the next draw builds, so a redraw is the
	// whole of the effect -- the tiles re-request with the new suffix
	gridcrop: draw,
	grid3x: draw,
	nu_szfmt: draw,
	nu_dens: apply_prefs,
	nu_thm: apply_prefs,
	nu_acch: apply_prefs
};

function cfg_set(k, v) {
	// dotfiles is the one preference the server enforces, so its write is
	// not ours: set_dots owns the key, the cookie, the tree's caches and the
	// refetch, and they have to happen together or the D3 trap reopens.
	if (k == "dotfiles")
		set_dots(v);
	else {
		setpref(k, v);
		var fx = PREF_FX[k];
		if (fx)
			fx();
	}

	// always, and last: the screen is rendered FROM the preferences, so this
	// is what moves the knob the user just tapped.
	render_cfg();
}

function cfg_click(e) {
	var el = e.target && e.target.closest ? e.target : null;
	if (!el)
		return;

	// the segmented options and the swatches carry their own value; a toggle
	// row carries only its key, and flips whatever is there now
	var b = el.closest(".nu_copt, .nu_swa");
	if (b)
		return cfg_set(b.getAttribute("data-c"), b.getAttribute("data-v"));

	b = el.closest(".nu_crow");
	if (b && !b.disabled && b.getAttribute("data-c"))
		cfg_set(b.getAttribute("data-c"), !pref(b.getAttribute("data-c")));
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
		}],

	// the wide equivalent of the swipe, and a ROW in this table rather than
	// a second menu (spec 0002 D2). copy-link and delete were left out of
	// this table on purpose until there was a visible door for them: the
	// swipe is that door narrow, the selection bar is that door wide, and
	// these two are the accelerator over both -- never the only way in,
	// because a hover-only action is unreachable by a finger at 1400px.
	//
	// both are gated on item_by_key rather than on `r` alone, which is also
	// what keeps them off the "back" row: it carries no data-k, so there is
	// no listing entry to copy a link to or to destroy.
	["link", "ctx_link",
		function (r) { return !!item_by_key(r.getAttribute("data-k")); },
		function (r) {
			var f = item_by_key(r.getAttribute("data-k"));
			if (f)
				copy_link(f);
		}],

	["rm", "nu_a_rm",
		function (r) {
			return !!srvcfg.have_del && !!(perms && perms.indexOf("delete") + 1) &&
				!!item_by_key(r.getAttribute("data-k"));
		},
		function (r) {
			var f = item_by_key(r.getAttribute("data-k"));
			if (!f)
				return;

			// the swipe gets no dialog because it already cost a deliberate
			// drag and a deliberate tap; ONE right-click and one menu item
			// is not two deliberate acts, so this one asks
			try {
				if (!confirm(t("nu_rm_ask").replace("%", nm(f))))
					return;
			}
			catch (ex) { return; }

			rm_send([vp_of(f)]);
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
	// it puts the active element on a <button>, which the keydown
	// handler's typing guard does not catch
	var b = el.querySelector(".nu_ctxb:not([disabled])");
	if (b)
		b.focus();
}

// `.nu_row, .nu_tile`, not `.nu_row`: CTX reads only `.nu_dir` and the href,
// and a tile carries both -- so the accelerator follows the view instead of
// vanishing when the grid is on, which would make it hover-only AND
// view-only (spec 0002 D2 forbids the first; the second is just a bug).
function ctx_menu(e) {
	var r = e.target && e.target.closest ?
		e.target.closest(".nu_row, .nu_tile") : null;
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

	// a name the new listing no longer carries drops out of the selection:
	// the refresh after a delete must not leave the status line counting
	// rows the server has just destroyed.
	var keep = {};
	for (var a = 0; a < ST.items.length; a++) {
		var k = nm(ST.items[a]);
		if (ST.sel[k])
			keep[k] = 1;
	}
	ST.sel = keep;

	draw();
}

// the ONLY builder of an `?ls` url, which is what makes the dots rule
// enforceable: want_dots() is evaluated here, on every call, so a listing
// fetched after the toggle carries the new answer and one fetched before it
// carried the old one. a `dots` latched into a variable at boot -- or left
// to the cookie -- is the D3 failure, and it fails on the second navigation,
// not the first.
function fetch_ls(vpath, cb) {
	var url = vpath + (vpath.indexOf("?") < 0 ? "?" : "&") + "ls" +
		(want_dots() ? "&dots" : "");

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
// (httpcli.py:6114). there is no cookie fallback here at all, so the
// client's own preference is the ONLY thing that can answer, and it has to
// ride along on every single ?tree= request.
//
// this used to read the cookie, back when nu had no toggle of its own. it
// must not: the cookie is now a write-only shadow kept for the first paint
// (see set_dots), and reading it back would put the tree one navigation
// behind the listing beside it.
function tree_dots() {
	return want_dots();
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

	// same collation as the listing's name sort, so the two agree -- and it
	// reads the same preference, so they still agree after the user flips it
	ret.sort(function (a, b) {
		return a.name.localeCompare(b.name, undefined, {
			numeric: !!pref("nsort"), sensitivity: "base"
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

// --ui-notree has meant "hide navpane in the UI" since __main__.py's 2026,
// and it suppresses EVERY container of this widget, not just the dock. the
// key is in js_htm only when the volflag is truthy (authsrv.py:3338-3341),
// so a plain truthiness read is the whole gate -- and it sits in front of
// the LOADER as well as in front of each mount: with nothing on screen to
// paint it into, a ?tree= is a roundtrip nobody will ever read.
function have_tree() {
	return !srvcfg.ui_notree;
}

// ONE fetch, N containers. the dock and 0001 card 4's bottom sheet are two
// mounts of the same widget and either of them can be the first to ask for
// it, so "has the tree been fetched" stopped being the same question as
// "is the dock rendered" -- which is the only one a single `tree_lit` flag
// could answer, and it answered it for the dock. a sheet opened at phone
// width would have set that flag, and a later resize past 64em would then
// find tree_boot() returning early: the tree in memory, and no dock on
// screen, forever.
//
// so the flag is gone and the cache is the state -- ST.tree.root once the
// answer is here, `tree_wait` while it is on its way. a caller arriving
// during the request queues on it instead of starting a second one, which
// is what holds flapping across the breakpoint (and a double tap on the
// folder title) to exactly one ?tree=.
var tree_wait = null,
	// bumped by tree_reset. an answer already in flight when the dots
	// preference flips is an answer to the OLD question, and letting it
	// land in the new tree is precisely the trap tree_reset exists to
	// close -- the flag it used to clear could not express "and throw away
	// the request I cannot cancel".
	tree_gen = 0;

function tree_get(cb) {
	if (!have_tree())
		return;

	// synchronous when the answer is already here, so a second container
	// mounting the widget paints in the same frame it was asked to
	if (ST.tree.root)
		return cb(null, ST.tree.root);

	if (tree_wait)
		return tree_wait.push(cb);

	tree_wait = [cb];
	var gen = tree_gen;

	tree_first(function (err, root) {
		if (gen !== tree_gen)
			return;

		var q = tree_wait;
		tree_wait = null;

		if (!err)
			ST.tree.root = root;

		for (var a = 0; a < q.length; a++)
			q[a](err, root);
	});
}

// the dock's MOUNT: the loader's answer, render_tree, and then the dock's
// own second half -- the 16em track. it fetches when the dock FIRST becomes
// visible and not at boot, because a phone that never widens must not pay a
// ?tree= roundtrip, and the one request a resize past 64em triggers is the
// correct price -- unless the sheet has already paid it, in which case the
// loader answers from cache and no request is made at all.
function tree_boot() {
	tree_get(function (err, root) {
		if (err || !root)
			return;

		var el = ebi("nu_tree");
		render_tree(el);
		tree_dock(el);
	});
}

// -- the tree sheet ----------------------------------------------------
//
// the narrow band's container for the same widget, and a fourth tenant of
// sheet(). the widget is NOT rewritten here: render_tree() already takes
// its container as an argument for exactly this, and ST.tree.expanded and
// node.kids are shared state -- so a branch opened in the dock is already
// open when the sheet paints it, at no request, and the current folder is
// marked by the widget's own TREE_HERE in both.

// the full path, for the header's right-hand side. decoded and with the
// reverse-proxy prefix already stripped, because it is the same value the
// widget uses as the current node's identity -- the header and the mark
// inside it can never disagree.
function tree_path() {
	return "/" + TREE_HERE;
}

// this is the sheet's RENDERER, so sheet() runs it just before the sheet
// is shown. the path is known immediately; the widget arrives either in
// the same frame -- the loader has it, because the dock or an earlier open
// already paid -- or when the one ?tree= this UI ever pays for lands.
function render_tsh() {
	ebi("nu_tshp").textContent = tree_path();

	var el = ebi("nu_tshb");
	if (!ST.tree.root)
		el.innerHTML = '<p class="nu_empty">' + esc(t("nu_tsh_wait")) + '</p>';

	tree_get(function (err) {
		if (err)
			return (el.innerHTML =
				'<p class="nu_empty">' + esc(t("nu_tsh_err")) + '</p>');

		render_tree(el);
	});
}

// the folder title is the sheet's door -- the design's caret
// (README:94-95) -- and it is a door only where the sheet is the
// container: at >= 64em the dock is already on screen, and under
// --ui-notree there is no widget at all.
//
// bound the way the context menu is, and `disabled` rather than merely
// unbound: an unbound button is still in the tab order and still announced
// as a control. the caret follows the same attribute in css, so the
// affordance and the behaviour move together.
function tsh_bind(on) {
	var b = ebi("nu_hereb");
	if (!b)
		return;

	b.disabled = !on;
	b.onclick = on ? function () {
		sheet("nu_tsh", ST.sheet != "nu_tsh");
	} : null;

	// a window dragged past 64em with the sheet open would otherwise leave
	// it sitting over a layout that has the dock in it too
	if (!on && ST.sheet == "nu_tsh")
		sheet("nu_tsh", false);
}

// THE TREE TRAP. `kids` deliberately survives a collapse (tree_toggle), and
// ST.tree.root is fetched exactly once behind the loader -- both are caches
// of an answer the server gave for one value of `dots`. flip the preference
// and every branch already loaded keeps painting the old answer, while a
// branch opened afterwards paints the new one, in the same tree, at the same
// time.
//
// so the flip throws all of it away: the root, the open/closed map, the queue
// of callers waiting on a request whose answer is now stale, and (via the
// generation) the request itself. nothing here re-renders on its own -- it
// re-runs the MOUNT for whichever container is currently showing the widget,
// which today is the dock and from card 4 is also the bottom sheet.
function tree_reset() {
	ST.tree.root = null;
	ST.tree.expanded = {};
	tree_wait = null;
	tree_gen++;

	var el = ebi("nu_tree");
	if (el && !el.hidden)
		tree_boot();

	// the sheet is a container too, and an open one has to be repainted
	// now rather than the next time it is opened
	if (ST.sheet == "nu_tsh")
		render_tsh();
}

// the whole flip, in one place: the preference, the cookie that only the
// next first paint reads, the tree's caches, and a refetch of the listing we
// are standing in -- because the dotfiles the server withheld are not in
// ST.items to be revealed, they have to be asked for again.
function set_dots(v) {
	setpref("dotfiles", v);

	// the server tests the cookie's PRESENCE and never its value
	// (httpcli.py:7435), so `dots=` -- the empty value that expires it -- is
	// how it is turned off. `dots=y` matches what the classic UI writes
	// (browser.js:6983), so the two UIs agree on the first paint too.
	setck("dots=" + (v ? "y" : ""));

	tree_reset();

	fetch_ls(location.pathname, function (err, ls) {
		if (!err)
			take(ls);
	});
}

// -- boot --------------------------------------------------------------

(function () {
	// FIRST, above everything: the theme and the density are attributes on
	// <html>, and writing them before the list is built is what keeps the
	// first paint from flashing the wrong one. the hand-rolled localStorage
	// read that used to sit here is now one row of PREFS like any other.
	apply_prefs();

	watch_head();

	// the decode probes, started before the first draw and not after it: a
	// cached answer (the classic UI's own localStorage keys) resolves
	// synchronously right here, so the very first grid already asks for the
	// right format. an uncached one answers later and redraws once -- see
	// set_probe. the two data uris are browser.js:1244-1245's own.
	probe_img("webp", "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==");
	probe_img("jxl", "data:image/jxl;base64,/woIAAAMABKIAgC4AF3lEgA=");

	if (cfg && cfg.dsort)
		for (var a = 0; a < SORTS.length; a++)
			if (SORTS[a][0] == cfg.dsort) {
				ST.sortKey = cfg.dsort;
				ST.sortDir = SORTS[a][3];
			}

	// the classic UI strips the query from the address bar, so a bare ?nu0
	// would not survive a reload; leaving unpins instead. see docs/nu-ui.md
	// the strings that live in nu.html: jinja cannot see Ls, so the markup
	// carries the english and boot overwrites it with t().
	ebi("nu_q").placeholder = t("nu_q");
	ebi("nu_sh2").textContent = t("gt_sort");
	ebi("nu_shint").textContent = t("nu_s_rev");
	ebi("nu_tshh").textContent = t("tree_h");

	// the settings screen's two static nodes. its title is the router row's
	// own key -- the door and the room say the same word, in every language,
	// from one string.
	ebi("nu_cfgh").textContent = t("nu_m_cfg");
	ebi("nu_cfgx").setAttribute("aria-label", t("nu_back"));

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

	ebi("nu_bar").onclick = act_click;
	ebi("nu_tools").onclick = act_click;

	// the nav bar's right slot (README:96-97). appended here rather than
	// shipped in nu.html because it is a door into a MODE, and the two
	// words it can say are the mode's own -- they come out of the same
	// t() table sel_fx() reads, so the label and the state cannot drift.
	// created ONCE and only ever relabelled after that, the rule #nu_sort
	// lives by: a control must never be re-rendered under a finger that is
	// already on it.
	var selb = document.createElement("button");
	selb.id = "nu_selb";
	selb.type = "button";
	// the mode is off at boot, and sel_fx() owns every change after this
	selb.textContent = t("nu_sel");
	selb.setAttribute("aria-pressed", "false");
	selb.onclick = function () { set_sel(!ST.selmode); };
	ebi("nu_nav").appendChild(selb);

	// the checkbox is a control living inside an <a href>, so the list
	// needs its own click handler at every width and on every pointer --
	// see sel_click for the three things it takes from the browser and the
	// one it deliberately does not.
	ebi("nu_list").onclick = sel_click;

	// the long-press is a touch gesture, so it is installed only where
	// there is a coarse pointer, and removed again the moment there is
	// not. same shape as ctx_bind below: a hybrid folded into a slate
	// gains it and folded back loses it, both without a reload -- which is
	// what makes this a capability and not a width.
	lp_bind(CAP.coarse);
	CAP.on("coarse", function (v) { lp_bind(v); });

	// the drag gestures ride the same capability and the same re-bind. two
	// bindings and not one because they live on two elements -- the press
	// belongs to the list, the swipe reaches past it into #nu_main's
	// padding -- but they flip together, always.
	gst_bind(CAP.coarse);
	CAP.on("coarse", function (v) { gst_bind(v); });

	// one node, two jobs, and the mode is what picks: the labels these two
	// wear are written by render_stat in the same branch, so what the
	// button says and what it does cannot come apart.
	ebi("nu_sort").onclick = function () {
		if (ST.selmode)
			return sel_all();

		sheet("nu_sheet", ST.sheet != "nu_sheet");
	};
	ebi("nu_view").onclick = function () {
		if (ST.selmode)
			return sel_inv();

		set_view(!pref("nu_grid"));
	};
	ebi("nu_veil").onclick = function () {
		if (ST.sheet)
			sheet(ST.sheet, false);
	};
	ebi("nu_sopts").onclick = function (e) {
		var b = e.target.closest(".nu_sopt");
		if (b)
			pick_sort(b.getAttribute("data-k"));
	};

	// the back chevron is the screen's own door out; Escape is the keyboard's
	// and it is already handled for every tenant of sheet().
	ebi("nu_cfgx").onclick = function () { sheet("nu_cfg", false); };
	ebi("nu_cfgb").onclick = cfg_click;

	ebi("nu_mopts").onclick = function (e) {
		var b = e.target.closest(".nu_mrow");
		if (!b || b.disabled)
			return;

		var m = menu_row(b.getAttribute("data-m"));
		// closed BEFORE the handler runs: a row that navigates would
		// otherwise leave the sheet on screen for the length of the
		// request, and unpin()'s xhr is not instant.
		sheet("nu_menu", false);

		if (m && m[4])
			m[4]();
	};

	// one keydown listener for the whole UI, extended in place rather than
	// joined by a second one: two listeners on document would each have to
	// re-derive the typing guard, and the day they disagree the bug is
	// invisible.
	document.addEventListener("keydown", function (e) {
		var k = e.key;

		// Escape comes FIRST, above the typing guard on purpose: a text
		// field eats arrow keys, but it does not eat Escape, and the place
		// the user is most likely to be typing (#nu_q) is exactly where
		// they reach for Escape to close the sheet. so Escape stays
		// unconditional -- the guard below covers the navigation keys.
		if (k == "Escape") {
			ctx_hide();

			if (ST.sheet)
				sheet(ST.sheet, false);

			return;
		}

		// the typing guard, which owns everything below it, is deliberately
		// wider than the one it is modeled on: the classic UI reads the
		// active element the same way (browser.js:6237-6238) but then guards
		// on `input` alone (:6306-6307). a textarea eats arrow keys exactly
		// like #nu_q does, a <select> eats them to change its value, and a
		// contenteditable eats them to move a caret -- the extra branches
		// cost nothing and `isContentEditable` appears nowhere else under
		// web/ because nothing else here has had to care yet.
		var ae = document.activeElement,
			aet = ae ? (ae.nodeName || "").toLowerCase() : "";

		if (aet == "input" || aet == "textarea" || aet == "select" ||
			(ae && ae.isContentEditable))
			return;

		// the menu owns the keyboard while it is open; walking the list
		// underneath it would drag focus out from under the menu
		if (ctx_row)
			return;

		// never steal a browser shortcut. shift is the exception the
		// listener was already written around: there is no browser
		// shortcut on shift+arrow inside a list of links, and it is the
		// keyboard's own door into selection -- claimed below, in the same
		// listener rather than in a second one.
		if (e.ctrlKey || e.altKey || e.metaKey)
			return;

		// focus follows navigation and NOTHING else -- no selection state
		// is created here. the rows are already <a href> elements, so they
		// are focusable, Enter is the browser's own activation and needs no
		// handler, and .focus() does the scrolling.
		// both renderers, one traversal: a tile is an <a href> exactly like
		// a row is, so the arrows walk whichever view is on screen. gating
		// this on `.nu_row` alone would silently kill the keyboard the
		// moment the view preference flipped.
		var rows = ebi("nu_list").querySelectorAll(".nu_row, .nu_tile");
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

		// shift extends the selection as the focus travels, which makes
		// the mode reachable with no pointer at all. the redraw replaces
		// the node the focus was on, so the focus is re-taken after it --
		// by index, because nothing here changed the order.
		if (e.shiftKey) {
			var f = item_by_key(rows[nxt].getAttribute("data-k"));
			if (f) {
				if (!ST.selanchor) {
					var cf = cur < 0 ? null :
						item_by_key(rows[cur].getAttribute("data-k"));

					if (cf) {
						sel_set(cf, true);
						ST.selanchor = nm(cf);
					}
				}

				sel_set(f, true);
				ST.selanchor = nm(f);
				ST.selmode = true;
				sel_fx();
				rows = ebi("nu_list").querySelectorAll(".nu_row, .nu_tile");
			}
		}

		if (rows[nxt])
			rows[nxt].focus();
	});

	// have_tree() is the --ui-notree gate (see it for why a truthiness read
	// is the whole of it), and it sits here, above the subscription, so the
	// dock is neither rendered nor fetched and #nu_shell never gets its
	// data-tree.
	//
	// otherwise the dock is a wide-band surface, so the widget is only
	// ever built once the band is actually entered -- at boot if we start
	// there, and otherwise on the first crossing. CAP re-reads the query
	// on change, so a window dragged wider gets its dock without a reload.
	if (have_tree()) {
		if (CAP.wide)
			tree_boot();
		else
			CAP.on("wide", function (v) { if (v) tree_boot(); });
	}

	// the sheet is the narrow band's container for the widget the dock holds
	// up there, so the title is a door only below 64em -- and never at all
	// when have_tree() says there is nothing to open. CAP re-reads the query
	// on change, so a window dragged across the band gains and loses the
	// door without a reload, and loses the open sheet with it.
	tsh_bind(!CAP.wide && have_tree());
	CAP.on("wide", function (v) { tsh_bind(!v && have_tree()); });

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

	// the bar moves between its two containers on the same query CAP already
	// re-reads, so a window dragged across 64em re-places it without a
	// reload -- and there is never a frame with the bar in both.
	render_acts();
	CAP.on("wide", function () { render_acts(); });

	if (ls0)
		return take(ls0);

	// shouldn't happen: is_js is forced for this template
	fetch_ls(location.pathname, function (err, ls) {
		if (err)
			return (ebi("nu_list").innerHTML =
				'<p class="nu_empty">' + esc(t("nu_eload")) + ': ' + esc(err.message) +
				' &mdash; <a href="?nu0">' + esc(t("nu_eold")) + '</a></p>');

		take(ls);
	});
})();

var J_NU = 2;
