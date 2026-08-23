// the new UI -- skeleton.
//
// reads the same json the classic UI reads; touches no server logic.
// `ls0` is embedded in the html by httpcli (is_js branch), and further
// navigation refetches with `?ls`. NOTE: the `?ls` json drops the `name`
// and `dt` keys (see tx_ls in httpcli.py) -- `ls0` keeps them -- so every
// reader here goes through nm()/dt() rather than touching them directly.

"use strict";

var ebi = document.getElementById.bind(document);

function esc(t) {
	return String(t == null ? "" : t).replace(/[<>&"]/g, function (c) {
		return { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c];
	});
}

// dirs come back with a trailing slash on href
function isdir(f) {
	return /\/(\?|$)/.test(f.href);
}

// `name` only exists in the embedded ls0; derive it from href otherwise
function nm(f) {
	if (f.name)
		return f.name.replace(/\/$/, "");

	var h = f.href.split("?")[0].replace(/\/$/, "");
	try { return decodeURIComponent(h); }
	catch (ex) { return h; }
}

function dt(f) {
	if (f.dt)
		return f.dt;

	if (!f.ts)
		return "";

	var d = new Date(f.ts * 1000),
		p = function (n) { return (n < 10 ? "0" : "") + n; };

	return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
		" " + p(d.getHours()) + ":" + p(d.getMinutes());
}

var UNITS = ["B", "K", "M", "G", "T", "P"];
function humansize(n) {
	if (!n)
		return n === 0 ? "0" : "";

	var i = 0;
	while (n >= 1024 && i < UNITS.length - 1) { n /= 1024; i++; }
	return (i && n < 10 ? n.toFixed(1) : Math.round(n)) + UNITS[i];
}

// -- theme -------------------------------------------------------------

function set_thm(t) {
	document.documentElement.setAttribute("data-thm", t);
	try { localStorage.setItem("nu_thm", t); } catch (ex) { }
}

(function () {
	var t = null;
	try { t = localStorage.getItem("nu_thm"); } catch (ex) { }
	if (!t)
		t = /dark|dz|hy/.test(dtheme || "") ? "dark" : "light";

	set_thm(t);
})();

// -- render ------------------------------------------------------------

function render(ls) {
	var dirs = ls.dirs || [],
		files = ls.files || [],
		all = dirs.concat(files),
		html = [];

	if (!all.length) {
		ebi("nu_list").innerHTML = '<p class="nu_empty">this folder is empty</p>';
		return;
	}

	html.push('<table id="nu_files"><thead><tr>' +
		'<th class="nu_n">name</th>' +
		'<th class="nu_s">size</th>' +
		'<th class="nu_d">modified</th>' +
		'</tr></thead><tbody>');

	for (var a = 0; a < all.length; a++) {
		var f = all[a],
			d = isdir(f);

		html.push('<tr class="' + (d ? "nu_dir" : "nu_file") + '">' +
			'<td class="nu_n"><a href="' + esc(d ? keep(f.href) : f.href) + '">' +
			(d ? "📁 " : "📄 ") + esc(nm(f)) + '</a></td>' +
			'<td class="nu_s">' + (d ? "" : esc(humansize(f.sz))) + '</td>' +
			'<td class="nu_d">' + esc(dt(f)) + '</td>' +
			'</tr>');
	}

	html.push('</tbody></table>');
	ebi("nu_list").innerHTML = html.join("");

	ebi("nu_note").textContent =
		dirs.length + " dirs, " + files.length + " files" +
		(perms && perms.length ? " · " + perms.join(" ") : "");
}

// fetch a listing as json; used by future in-page navigation
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

// -- mode plumbing -----------------------------------------------------

// the new UI is reachable two ways: the `ui=nu` cookie (sticky, every
// request) or `?nu` (this request only). when we got here without the
// cookie, every link out of this page must carry `?nu` along or the next
// click silently lands back in the classic UI.
var STICKY = /(^|;\s*)ui=nu(;|$)/.test(document.cookie);

function keep(href) {
	if (STICKY || !href || /^[a-z]+:/i.test(href))
		return href;

	return href + (href.indexOf("?") < 0 ? "?nu" : "&nu");
}

function pin(on) {
	// ?setck is an existing server endpoint; see setck() in httpcli.py
	var xhr = new XMLHttpRequest();
	xhr.open("GET", SR + "/?setck=ui=" + (on ? "nu" : ""), true);
	xhr.onloadend = function () {
		// drop any ?nu/?nu0 so the cookie alone decides what we get
		location.href = location.pathname;
	};
	xhr.send();
}

// -- boot --------------------------------------------------------------

(function () {
	ebi("nu_thm").onclick = function () {
		var cur = document.documentElement.getAttribute("data-thm");
		set_thm(cur == "dark" ? "light" : "dark");
	};

	// the escape hatch. ?nu0 alone would only survive one request: the
	// classic UI strips the query from the address bar, so a reload would
	// bounce you straight back here. so when the new UI is pinned,
	// leaving for the classic one unpins it -- you stay where you land.
	var esc_a = ebi("nu_old");
	esc_a.href = location.pathname + "?nu0";
	if (STICKY)
		esc_a.onclick = function (e) {
			e.preventDefault();
			pin(false);
		};

	var b = ebi("nu_pin");
	b.textContent = STICKY ? "★" : "☆";
	b.title = STICKY
		? "the new UI is your default; click to unpin"
		: "click to make the new UI your default";
	b.onclick = function () { pin(!STICKY); };

	// breadcrumbs are rendered server-side and know nothing about ?nu.
	// the root node's label is "/", which would double up with the "/"
	// separator that nu.css draws between crumbs -- so give it an icon.
	var cr = document.querySelectorAll("#nu_crumbs a");
	for (var a = 0; a < cr.length; a++) {
		cr[a].href = keep(cr[a].getAttribute("href"));
		if (!a && cr[a].textContent.trim() == "/") {
			cr[a].textContent = "🗀";
			cr[a].title = "root";
		}
	}

	if (ls0)
		return render(ls0);

	// no embedded listing (shouldn't happen; is_js is forced for this tpl)
	fetch_ls(location.pathname, function (err, ls) {
		if (err) {
			ebi("nu_list").innerHTML =
				'<p class="nu_err">could not load listing: ' + esc(err.message) +
				' &mdash; <a href="?nu0">try the classic UI</a></p>';
			return;
		}
		render(ls);
	});
})();

var J_NU = 2;
