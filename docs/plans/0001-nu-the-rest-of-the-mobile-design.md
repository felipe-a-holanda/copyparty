---
number: 0001
type: plan
slug: nu-the-rest-of-the-mobile-design
title: "The rest of the mobile design: nu beyond the base layer"
status: planejado
created: 2026-08-23
tags: [plan, status/planejado]
par: "[[specs/0001-nu-the-rest-of-the-mobile-design|spec]]"
---

**Hardened:** 2026-08-23 against `deca3c68`

> Eight sessions that take `nu` from "a list you can look at" to "a phone you can
> actually work from". No new route, no new parameter, no new response field.

## Context

`nu` is the second filebrowser UI (`docs/nu-ui.md`); its base layer landed in
`0affcaee` — list, row, navigation, sticky header, sort sheet. Spec 0001 scopes the
seven surfaces the mobile design specifies and that slice left out, plus the
recursive tier of search. Upload is deferred to its own spec (0001 §D2).

Read the spec for the *why*. This file is the *how it lands*.

The design of record is `design-handoff/extracted/design_handoff_nu_mobile/README.md`
(354 lines). Its seven numbered screens live under one `## Telas` heading, and the
numbering is **not** what an outside reader would guess:

| § | line | what it actually is |
|---|---|---|
| 1 | `README.md:82` | the whole base screen — header (4 bands), list *and* the bottom bar |
| 2 | `:144` | grid mode |
| 3 | `:157` | the folder-tree sheet |
| 4 | `:174` | the sort sheet (already built) |
| 5 | `:184` | the `⋯` menu |
| 6 | `:197` | the settings screen |
| 7 | `:224` | the image viewer |

"Barra inferior" is a bold sub-heading **inside** §1 (`:136-142`), not a section of
its own. Every card below cites the line range, not just the §.

The prototypes (`*.dc.html`) are design references, not code to copy
(`README.md:17-21`), and their strings are pt-BR only because that is the author's
language — the handoff itself requires every string to go through the existing i18n
with English as the base (`README.md:36-38`). That requirement is Card 1.

## The coupling to spec 0002 — real, named, not resolved here

`docs/specs/0002-nu-desktop-is-a-first-class-width.md` makes width a first-class
variable and states plainly that **this plan is written against a single viewport and
must be re-planned once 0002 lands** (0002 §D5). That is a fact about this file, not a
risk to manage inside it, and it is recorded here so no card is executed in ignorance
of it.

Two consequences bind the cards below even if 0002 lands after them:

- **The tree widget belongs to 0002 §D3.** The reader, the lazy expansion, the node
  render and the current-path highlight are *one* piece of code; docking it in a left
  column is 0002, wrapping it in a bottom sheet is Card 4 here. Whichever spec executes
  first writes the widget; the second one writes only its container. Card 4 is written
  for the case where it goes first, and says so in its own `do:`.
- **Every card owes the wide band a clause** (0002 §D5's contract table): Card 1's
  action bar is one component with two placements, Card 2's settings screen is a
  centered panel at `>= 1024px` and its density toggle carries 0002's wide default,
  Card 3's tiles get a wide size, Card 5's long-press is `(pointer: coarse)` only,
  Card 6's gestures likewise, Card 7's viewer is not a full-bleed overlay at width.
  None of that is built here. It is listed so that when `/planc` re-runs, the diff is a
  clause per card and not a rewrite.

Resolving the ordering is 0002's business, not this file's.

## Decisions pinned here (open questions from spec §Open questions)

- **Move's destination picker.** Confirmed: the tree sheet (Card 4) is the widget, in a
  "pick a folder" mode. But the *flow* stays deferred — Card 5 lands the `Mover` button
  only, for two reasons. `?move=` takes **one source per request**
  (`POST <src>?move=<dst>`, dst being the full destination path including filename), so
  N selected items are N requests with N partial-failure states and no batch endpoint to
  lean on. And a folder source is a **long, abortable** operation: `up2k.handle_mv`
  (`copyparty/up2k.py:4590`) walks the whole tree server-side when the source is a
  directory (`:4625-4658`), checking an abort key after every file (`:4650`), which is
  what `?fs_abrt` (`httpcli.py:6873`) exists for. So the flow needs progress and
  cancellation, not just a destination picker. That is a flow to design, not a button to
  wire.

- **Density toggle.** A row in the settings screen (Card 2). The handoff gives the
  compact metric exactly once — `padding:14px 16px` for the touch row, `9px 16px`
  compact (`README.md:114-115`) — and names **no** switch for it anywhere: there is no
  density row in §6's four groups, no key in its required-state list (`:253-257`), and
  no gesture. Settings is the only plausible home, and 0002 §D1 makes the same toggle
  the wide band's default-compact override, so one control serves both.

- **Preference keys reuse the classic UI's, where the meaning is identical.** The
  handoff asks for this outright (`README.md:220-222`: reusing the same `localStorage`
  keys "seria o ideal, para as duas UIs concordarem"), and it is cheap because the
  classic UI's keys are bare, unprefixed element ids written through
  `sread`/`swrite` (`util.js:1243-1259`) and bound by `bcfg_bind` (`:1348`):
  `dotfiles` (`browser.js:6981`), `dir1st` (`:6990`, read as `sread('dir1st') !== '0'`
  at `:3736`), `nsort` (`:6989`, read at `:3693`) and `thumbs` (`:6040`, written as
  `0`/`1` at `:6031`). Same origin, same meaning, `"1"`/`"0"` values — so `nu` writes
  those four keys directly and a user who configured the classic UI finds `nu` already
  configured. Preferences with **no** identical counterpart get an `nu_`-prefixed key:
  size format (`nu` offers Auto/Decimal/Binário; the classic UI has fifteen formats,
  a different value space), density, grid, and accent. `nu_thm` already exists and is
  read at boot (`nu.js:395-400`).

- **The header's right slot has to be vacated before Card 5 can use it.** The design
  puts `Selecionar` / `Concluir` in the nav bar's right slot (`README.md:96-97`); today
  that slot holds the `classic` escape link (`nu.html:25`, `#nu_old`). So Card 1 moves
  the escape hatch into the `⋯` — which is also where spec 0001 §D2 routes the disabled
  upload button — and Card 5 then owns the slot. The hatch must never become
  unreachable: `docs/nu-ui.md` guarantees it in both directions, and `unpin()`
  (`nu.js:163`) is what makes it survive a reload when the `ui=nu` cookie is set.

- **Accent is a hue, not a colour.** The handoff's four swatches are one lightness and
  one chroma with four hues — 300 (default), 250, 160, 60 — and it says so explicitly
  ("Todos os acentos compartilham lightness e chroma; só o hue muda. Trocar acento não
  deve exigir mais nada", `README.md:297-298`). `nu.css` defines `--accent` **three
  times** — light (`:6`, `oklch(0.55 0.13 300)`), OS-dark (`:61`,
  `oklch(0.72 0.12 300)`) and manual dark (`:92`) — so writing a finished colour onto
  `documentElement` silently defeats the dark palette. The picker sets a hue variable
  that all three definitions consume; it never sets `--accent` itself.

- **A theme control is beyond the handoff, and lands anyway.** §6's four groups are
  Exibição / Tamanhos / Aparência / Conta, with **no theme row**; the coverage matrix
  scores "Temas (10 variantes)" as `Não migrado`, noting the new design has one light
  theme and a swappable accent. But the base layer already shipped a full dark palette
  (`nu.css:46-76` under `prefers-color-scheme`, `:78-106` for a manual `data-thm`) and a boot
  read of a stored `nu_thm` key (`nu.js:395-400`) that **nothing writes**. Either that
  code is dead or something switches it. Card 2 adds the switch — light / dark / system
  — as a named addition to the design, not as a silent one.

## What the investigation changed about the shape

Four findings move work between cards or change how a commit is written. All four are
load-bearing.

### `cgv1` is already in the template — and it is a string, not an object

`j2a` already passes `"cgv1": vn.js_htm` (`copyparty/httpcli.py:7333`), and `js_htm`
(`copyparty/authsrv.py:3285-3358`) carries exactly the capability flags the later cards
need: `have_shr` (`:3293`), `have_zip` (`:3295`), `have_mv` (`:3297`), `have_del`
(`:3298`), `ext_th` (`:3302`), `see_dots` (`:3311`). The `nu.html` bootstrap simply does
not bind it yet.

**It is already serialized.** `vn.js_htm` is assigned
`json_hesc(json.dumps(js_htm))` (`authsrv.py:3358`) — a `str` holding JSON, with `<`,
`>` and `&` pre-escaped (`util.py:2582-2583`). Every existing template therefore
interpolates it **raw**: `CGV1 = {{ cgv1 }}` (`browser.html:140`, `md.html:138`,
`mde.html:35`). Piping it through `|tojson` would JSON-encode a JSON string and hand
the client a `String`, not an object — `srvcfg.have_del` would be `undefined` and every
capability gate would silently fail open or closed. The jinja environment is built with
no autoescape (`httpsrv.py:186`, `jinja2.Environment()`), so raw is also safe.

So the spec's escape clause ("if a commit edits `httpcli.py` beyond a template
variable, stop") tightens to **zero**: binding `cgv1` in the template's existing script
block is a `nu.html` edit, not an `httpcli.py` one. Any `.py` diff in this plan is a
signal to stop.

Permissions are already bound too — `perms` (`nu.html:68`, from `cgv.perms`,
`httpcli.py:7269-7285`) carries `read`, `write`, `move`, `delete`, `dot`, `get`,
`upget` and `admin`, so every destructive control and the dotfile row gate client-side
with no roundtrip.

### The classic UI's i18n breaks the moment `nu` adds a key — and `nu` cannot just copy the wiring

`browser.js:716` resolves the language **whole-object**:

```javascript
var L = Ls[lang] || Ls.eng, LANGS = [];
```

The 22 files under `copyparty/web/tl/` each set `Ls.<lang> = {...}` keyed to
`browser.js`'s namespace (`browser.js:11`, `Ls.eng = {`). A `por` user gets `Ls.por` —
which contains none of `nu`'s keys. There is **no per-key fallback**, so every new key
renders `undefined`, in every language except English, silently.

This is why i18n is in **Card 1** rather than last: `nu` needs a `t(k)` helper doing
per-key fallback before any card adds a string, or seven cards' worth of strings get
retrofitted after the fact — the pass that never happens.

Two mechanics make copying `browser.html:155` verbatim wrong:

- **`Ls` is declared in `util.js`** (`:310-311`, `if (!window.Ls || !window.langmod)
  var Ls = {};`), which `nu` does not load and should not: `util.js` is 2415 lines and
  installs a global crash renderer at import time (`:307`, `window.onerror = vis_exh`).
  `nu.html` declares `var Ls = {}` in its own bootstrap block instead — one line, before
  the `tl` script tag.
- **There is no `web/tl/eng.js`.** `RES` lists exactly `chi cze deu epo fin fra grc hun
  ita jpn kor nld nno nor pol por rus spa swe tur ukr vie`
  (`copyparty/__init__.py:116-137`) — English lives inline in `browser.js:11`. Since
  `--lang` defaults to `eng` (`__main__.py:1974`), an unguarded copy of
  `browser.html:155` makes the default install fetch a 404 on every page load. The tag
  is emitted only when `lang != "eng"`; `Ls.eng` comes from `nu.js` itself.

And `cplng` is a **cookie**, never a query parameter (`httpcli.py:344`,
`self.cookies.get("cplng") or self.args.lang`). Switching language for a manual check
is `?setck=cplng=por` — nine characters exactly, which is the maximum `setck` accepts
(`httpcli.py:5915`).

### `?th=` never 404s, so an `onerror` fallback cannot detect a thumbless volume

`--no-thumb` sets the `dthumb` volflag (`authsrv.py:2376-2377`), and on such a volume
the thumbnail branch skips the thumbnailer and falls through to
`return self.tx_ico(rem)` (`httpcli.py:7116-7133`) — **HTTP 200 with copyparty's own
extension icon**. A failed conversion is also a 200 (`tx_svg("--error--...")`,
`:7120-7122`); only `th=p` 404s (`:7128-7129`). So `<img onerror>` fires for network
failure and nothing else, and no flag in `js_ls` or `js_htm` announces `dthumb`.

The consequence is a gate correction, not new work: on a `--no-thumb` volume the tiles
show copyparty's served icons — which is exactly what the classic UI shows, and is not
a broken image. Card 3 keeps `onerror` for genuine transport failure and its gate
asserts what is actually observable. Making `nu` draw *its own* type chip there would
need a new `js_htm` cell, which the spec's zero-`.py` rule forbids; that is a question
for a later spec, not silent work here.

### `sheet()` is single-tenant, and Cards 1, 2 and 4 each add a tenant

`sheet(on)` (`nu.js:324-348`) is hardcoded to `ebi("nu_sheet")` / `ebi("nu_veil")`,
`render_sheet()` is hardcoded to `ebi("nu_sopts")`, `ST.sheet` is one boolean, the veil's
click handler closes that one sheet (`nu.js` boot), the `Escape` handler tests that one
boolean, and the 280ms teardown re-tests it (`if (!ST.sheet) s.hidden = ...`). Open a
second sheet inside that window and the first sheet's timer hides the second one.

So Card 1's "reuse the sheet machinery" is really **generalize it first**: `sheet(id,
on)` over a `ST.sheet` that holds an id or `null`. The synchronous-reflow line and the
comment explaining why it is not `requestAnimationFrame` survive verbatim. This is the
first commit of Card 1's sheet work, and Cards 2 and 4 depend on it.

## The endpoints each card talks to (all pre-existing)

| surface | request |
|---|---|
| new folder | `POST <vpath>` multipart, `act=mkdir` + `name` (dispatch `httpcli.py:3101`, `handle_mkdir:3736`) |
| folder tree | `GET <vpath>?tree=<top>[&dots][&k=]` → `{"a": [names], "k<name>": {nested}}` (`tx_tree:6062`, `gen_tree:6088-6169`) |
| delete | `POST <vpath>?delete` + JSON list of vpaths (dispatch `:3190`, `handle_rm:6777`) — one request for N files |
| download a selection | `POST <vpath>?zip[=fmt][&k=]` multipart form, `act=zip` + `files` = newline-separated basenames (dispatch `:3114`, `handle_zip_post:3125-3148`); a **form submit**, not XHR, because the browser has to receive the download (`browser.js:8891-8919`) |
| move | `POST <src>?move=<dst>` (`handle_mv:6808`) — one request per **item**; a folder source is walked server-side (`up2k.py:4625-4658`), so a whole tree is still one request |
| abort a move | `POST <vpath>?fs_abrt=<akey>` (`handle_fs_abrt:6873`) — folder moves check the key after every file (`up2k.py:4650`) |
| thumbnails | `GET <file>?th=x\|w\|j` (+`f` no-crop, +`3` hi-res) as in `browser.js:5870-5882`, format from the probes at `browser.js:1244-1245`; never 404s (see above) |
| recursive search | `POST <vpath>?srch` + `{"q": "...", "n": N}` (dispatch `:3184`, `handle_search:3267`, `n` optional and defaulted at `:3305`), `path` keyword in the DSL (`u2idx.py:272`) |
| dotfiles | `dots` in the **query string** of every `?ls` and every `?tree` (see below) |
| cookie writes | `GET ?setck=<k>=<v>` (`setck:5913`) — `k=v` capped at 9 chars (`:5915`); an empty value expires the cookie (`:5918`) |

## Sessions  ·  one card = one fresh session; a card may land several commits; git carries state between cards

Single lane: every card edits `copyparty/web/nu.js`, `nu.css` and `nu.html`, so the
touches collide by construction and the cards run in sequence. No `lane:` stamps.

There is no JS test harness in this repo, so each card's gate is the Python suite
(proves nothing regressed) **plus a named, falsifiable manual check** at 390×844.
Serve a test volume with `-e2dsa` so indexed-only behavior is exercised.

### Card 1 — The shell: i18n, bottom bar, and the ⋯ router
precondition:  none — first card
read for why:  `docs/specs/0001-nu-the-rest-of-the-mobile-design.md` §D1 (why the ⋯ is
               a router) and §D2 (why upload is a disabled button, not a hidden one);
               handoff `README.md:36-38` (every string goes through i18n),
               `:136-142` (the bar), `:184-195` (the menu)
commits:
  1. nu: route strings through the existing i18n, with a per-key fallback
     touches: copyparty/web/nu.html, copyparty/web/nu.js  (only these)
     do:      - declare `var Ls = {}` in nu.html's existing bootstrap script block,
                **before** the tl tag: `Ls` lives in `util.js:310-311`, and `nu` does
                not load util.js (2415 lines, installs `window.onerror` at import,
                `util.js:307`)
              - emit `<script src=".cpr/w/tl/{{ lang }}.js">` the way
                `browser.html:155` does, but **guarded on `lang != "eng"`** — there is
                no `web/tl/eng.js` (`copyparty/__init__.py:116-137` lists chi..vie) and
                `--lang` defaults to `eng` (`__main__.py:1974`), so an unguarded tag
                404s on every default install
              - define `Ls.eng` in nu.js with nu's own keys, and add
                `function t(k) { return (L && L[k]) || Ls.eng[k] || k }` where
                `var L = Ls[lang]` — the per-key fallback the classic UI lacks
                (`browser.js:716` is whole-object, so a `por` user would get
                `undefined` for every key the 22 tl files do not carry)
              - move **every** hardcoded string through `t()`. In nu.js: the filter chip
                labels (`FILTERS`, :121), the sort labels and hints (`SORTS`, :131), the
                status line's `item`/`items` and the `Name` fallback (`render_stat`,
                :244-259), the Back row's `Back` / `parent folder` (`render_list`,
                :264-271), the two empty states `nothing matches` / `this folder is
                empty` (:294-297) and the boot error `could not load listing` /
                `try the classic UI` (:457-460). In nu.html: the search placeholder
                (:31), the sort sheet's `<h2>Sort by</h2>` (:51) and its
                `tap again to reverse` hint (:52), and the `classic` link (:25) — the
                three static ones get ids and are filled from `t()` at boot, since
                jinja cannot see `Ls`
              - reuse an existing tl key wherever the classic UI already ships the same
                string; only genuinely new strings get new `Ls.eng` keys
  2. nu: bind the server capability flags in the template
     touches: copyparty/web/nu.html
     do:      - add `srvcfg = {{ cgv1 }}` to the bootstrap script block alongside `cfg`.
                **Raw, never `|tojson`**: `vn.js_htm` is already a JSON *string*
                (`authsrv.py:3358`, `json_hesc(json.dumps(...))`), which is why every
                other template interpolates it bare (`browser.html:140`, `md.html:138`,
                `mde.html:35`); double-encoding it yields a `String` and every
                capability gate reads `undefined`
              - `j2a` already passes it (`httpcli.py:7333`), so this needs no server
                change and unlocks `have_del`, `have_mv`, `have_shr`, `have_zip`,
                `ext_th`, `see_dots` for the later cards
  3. nu: make the sheet machinery multi-tenant
     touches: copyparty/web/nu.js
     do:      - `sheet(id, on)` and `ST.sheet` holding an open sheet's id or `null`,
                replacing the single boolean and the hardcoded `ebi("nu_sheet")` /
                `ebi("nu_sopts")` (nu.js:324-348)
              - the veil's click and the `Escape` handler close whatever is open; the
                280ms teardown must check that *this* sheet is still the closed one, or
                a sheet opened inside that window gets hidden by its predecessor's timer
              - keep the synchronous-reflow line and its comment verbatim — the reason
                it is not `requestAnimationFrame` has not changed
  4. nu: add the bottom bar with new folder and the upload escape hatch
     touches: copyparty/web/nu.html, copyparty/web/nu.css, copyparty/web/nu.js
     do:      - the three-slot bar per `README.md:136-142`: `Enviar arquivos`
                (`flex:1.4`, accent bg, 15px/600), `Nova pasta` (`flex:1`, `--fill`,
                14px/500), `⋯` (48px fixed, `--fill`, 18px); container `--foot-bg`
                (nu.css:35) + blur 12px, top border `--line`, `padding:8px 12px 22px`,
                `gap:8px`, buttons `min-height:48px` `border-radius:14px`
              - the bar is fixed to the bottom and carries `env(safe-area-inset-bottom)`
                itself; `#nu_main`'s `padding-bottom: calc(28px + env(safe-area-inset-
                bottom))` (nu.css:299-300) rises to clear the bar's real height, or the
                last row sits under it
              - `Nova pasta` posts multipart `act=mkdir` + `name` to the current vpath,
                then re-renders via `fetch_ls(location.pathname, function (err, ls) { if
                (!err) take(ls); })` — `fetch_ls` (nu.js:370) is callback-only and does
                not call `take()` itself; shown only when `perms` contains `write`
              - `Enviar arquivos` renders **disabled** and routes to the classic UI on
                tap (spec §D2) — a dead button that explains itself, not a hidden one
                that makes the UI look finished
  5. nu: add the overflow menu as an extensible router
     touches: copyparty/web/nu.html, copyparty/web/nu.css, copyparty/web/nu.js
     do:      - a second tenant of commit 3's `sheet()`, `max-height:560px`, section
                headers 11px/700 and rows `min-height:50px` with a right-aligned meta
                and a `›` (`README.md:186-188`)
              - render from a declarative `MENU` table (key, label key, meta key,
                enabled predicate, handler) grouped into the design's two sections,
                `NESTA PASTA` and `SERVIDOR` (`:190-193`), so a later spec adds a row
                rather than redesigning the sheet (spec §D1)
              - the design's seven rows are `Nova nota .md`, `Enviar mensagem pro log`,
                `Desfazer upload recente` (meta `unpost`), `Uploads recentes`,
                `Compartilhamentos`, `Configurações`, `Control panel`. Spec 0001 defers
                all of them except `Configurações` (Card 2). They are declared in the
                table and rendered **disabled**, so the router's shape is right the
                first time and a later spec flips a predicate
              - **move the `classic` escape hatch here** from the nav bar's right slot
                (`nu.html:25`), which the design assigns to `Selecionar` / `Concluir`
                (`README.md:96-97`) and Card 5 needs. Keep `#nu_old`'s element and the
                `unpin()` binding (`unpin`, nu.js:163-169; bound at :411-414) intact — when the `ui=nu` cookie
                is set the link must still unpin, because a bare `?nu0` does not survive
                a reload (`docs/nu-ui.md`)
              - entries gate on `srvcfg` and `perms`
done when:     `python3 -m unittest discover -s tests` green (31 tests at `deca3c68`),
               **no `.py` file in the diff**, and at 390×844: the bar renders fixed
               above the list and the last row is fully scrollable into view above it,
               `Nova pasta` creates a folder and the listing refreshes without a page
               load, `⋯` opens and closes on the veil, opening the sort sheet within
               280ms of closing the `⋯` leaves the sort sheet visible, the `classic`
               link is reachable from the `⋯` and still unpins the cookie, and after
               `?setck=cplng=por` the page shows Portuguese where a key exists and
               **English, never `undefined`**, where it does not — with **zero 404s in
               the network log** on a default (`--lang eng`) server

### Card 2 — Preferences and the settings screen
precondition:  Card 1 landed — the ⋯ is where Settings is reached from, `sheet()` is
               multi-tenant, and `t()` must exist before this card adds ~25 strings
read for why:  spec §D3 in full. This is the card with the silent failure mode; the
               section explains it and the gate below is the check that catches it.
               Handoff `README.md:197-222` for the screen, `:293-298` for the accent
commits:
  1. nu: add the preference layer, seeded from the volume defaults
     touches: copyparty/web/nu.js
     do:      - `pref(k)` / `setpref(k, v)` over localStorage, tolerating a throwing
                accessor (private mode, blocked site data)
              - **key names per "Decisions pinned here"**: the four with an identical
                classic counterpart use the classic UI's own bare keys and its `"1"` /
                `"0"` encoding — `dotfiles`, `dir1st`, `nsort`, `thumbs`
                (`browser.js:6981`, `:6990`, `:6989`, `:6040`; `sread`/`swrite`,
                `util.js:1243-1259`) — so both UIs agree, as the handoff asks
                (`README.md:220-222`). Everything else is `nu_`-prefixed: `nu_szfmt`,
                `nu_dense`, `nu_grid`, `nu_acch`, plus the existing `nu_thm`
              - seed from `cfg` (`vn.js_ls`, `authsrv.py:3264-3282`). Note what is
                already wired: `cfg.dsort` is honoured at boot (nu.js:402-407) and
                `cfg.dnsort` already feeds `cmp_name` (`:175-179`) — those two become
                *user-overridable*, they are not new reads. Genuinely unread today are
                `cfg.dgrid` (:3268), `cfg.dcrop` (:3272) and `cfg.dth3x` (:3273), which
                Card 3 consumes
              - replace the constants the base layer really did hardcode: `dir1st`
                (nu.js:173) and the fixed unit table `UNITS` (`:73`) that `humansize()`
                (`:75`) walks — Auto / Decimal (1000) / Binário (1024) per
                `README.md:208`
  2. nu: send dots on every listing fetch, not just the first paint
     touches: copyparty/web/nu.js
     do:      - append `dots` to the url built in `fetch_ls()` (nu.js:370) when the
                preference is on. **The cookie alone is not enough**: the server
                short-circuits it on the `?ls` path (`httpcli.py:7433-7436`,
                `"dots" not in self.uparam and (is_ls or "dots" not in self.cookies)`),
                so a cookie-only toggle works on first paint and silently drops
                dotfiles on every navigation after
              - keep the cookie in sync via `?setck=dots=y` so the *first paint*
                (embedded `ls0`, not an `?ls` request) agrees with the toggle, and
                `?setck=dots=` to clear it — an empty value expires the cookie
                (`httpcli.py:5918`), and the server only tests the cookie's *presence*
                (`:7435`), never its value
              - the same query parameter is what `?tree` reads
                (`"dots" in self.uparam`, `httpcli.py:6114`; the classic navpane appends
                it at `browser.js:7229`), so Card 4's fetch carries it too — one
                preference, both readers
              - gate the whole feature on `perms` containing `dot`; hide the row rather
                than showing it inert
  3. nu: add the settings screen
     touches: copyparty/web/nu.html, copyparty/web/nu.css, copyparty/web/nu.js
     do:      - full screen off the ⋯ (`README.md:199-204`): own header with `‹` back,
                centered title, scrollable body `padding:16px 16px 40px`; uppercase
                group labels; cards `--surface` radius 14; rows `min-height:52px`
              - the design's four groups, in order (`README.md:206-211`):
                **Exibição** — `Arquivos ocultos` (sub "Mostrar arquivos que começam com
                ponto"), `Pastas primeiro`, `Ordenação natural`, `Miniaturas`,
                `Modo grade`; **Tamanhos** — `Formato de tamanho`, segmented
                Auto/Decimal/Binário; **Aparência** — `Cor de destaque`, 4 swatches of
                26px; **Conta** — `Idioma`, `Control panel`, `Sair`
              - of the Conta group, only `Idioma` is built (it is `?setck=cplng=<lang>`,
                which Card 1 already made meaningful); `Control panel` and `Sair` render
                disabled — spec 0001 defers the parity-only surfaces
              - **two additions to §6, both named as additions**: a `Densidade` row in
                Exibição (the handoff gives `9px 16px` vs `14px 16px` at
                `README.md:114-115` and names no switch), and a `Tema` row
                (light / dark / system) in Aparência — `nu.css:46-106` already ships the
                dark palette and `nu.js:395-400` already reads a stored `nu_thm` that
                nothing writes, so without this row that code is unreachable
              - the accent picker writes a **hue**, not a colour: the four swatches are
                hues 300 / 250 / 160 / 60 at the shared lightness and chroma
                (`README.md:297-298`), and `--accent` is defined three times in
                `nu.css` — light `:6`, OS-dark `:61`, manual dark `:92`. Refactor those
                three to consume a `--acc-h` custom property and set only that, or the
                dark theme keeps the default hue
              - controls per `README.md:213-218`: toggle 44 × 26 radius 13 with a 22px
                knob; segmented track `--fill` radius 10; swatch 26px with a 2px border,
                `--fg` on the selected one
done when:     suite green, no `.py` in the diff, and **the trap check**: with a user
               holding `udot`, turn hidden files on, confirm dotfiles appear, then
               **navigate into a subfolder and back** and confirm they are still there
               (a cookie-only implementation passes everything else and fails exactly
               here) — plus every preference survives a reload and the first paint
               already matches it before any refetch; plus `dir1st` set in the classic
               UI is already on when `nu` first opens (and the reverse), proving the
               shared keys; plus picking a non-default accent and switching the theme to
               dark keeps that accent

### Card 3 — Grid view and thumbnails
precondition:  Card 2 landed — grid, thumbnails and crop are preferences, and their
               defaults come from `cfg.dgrid` / `cfg.dcrop` / `cfg.dth3x`
read for why:  spec §D7 — short; it explains why no server capability is negotiated.
               Handoff `README.md:144-155`
commits:
  1. nu: add grid view as a second renderer
     touches: copyparty/web/nu.html, copyparty/web/nu.css, copyparty/web/nu.js
     do:      - a `render_grid(shown)` beside `render_list` (nu.js:261), fed by the same
                `filtered()` output — a second renderer, not a second data path
              - `flex-wrap` with `gap:6px`, `padding:8px 12px 120px` (the 120px is
                clearance for Card 1's bar), tiles 114 × 114 radius 12
                (`README.md:145-146`). The design does not state a column count; 114 × 3
                + 6 × 2 = 354 inside 390 − 24 of padding, so three columns fall out of
                the tile size at the design width and must not be hardcoded as a count
              - each tile: extension badge top-left (mono 9px, `letter-spacing:.08em`,
                on `rgba(255,255,255,.72)`), name footer 11px/500 truncated on
                `rgba(251,251,253,.88)`, and a slot top-right for Card 5's 22px checkbox
                (`README.md:151-155`). Folder and file placeholder fills per `:146-150`
              - the Grade/Lista control in the status line (`render_stat`, :244) and a
                mirror entry in the ⋯
  2. nu: add thumbnails to the grid
     touches: copyparty/web/nu.js, copyparty/web/nu.css
     do:      - `?th=` with the format chosen by browser probe (jxl `x`, webp `w`, else
                `j`), `f` when not cropping, `3` on hi-dpi — same negotiation as
                `browser.js:5870-5882`, with the support probes of `browser.js:1244-1245`
              - honour `srvcfg.ext_th` (per-extension icon overrides,
                `authsrv.py:3302`) before falling back to a thumb request, as
                `browser.js:5870-5872` does
              - keep an `onerror` fallback to the placeholder fill for genuine transport
                failure, but do **not** rely on it to detect a thumbless volume: `?th=`
                returns 200 with a server-rendered icon in that case
                (`tx_ico`, `httpcli.py:7133`), and 200 with an error SVG on a failed
                conversion (`:7120-7122`)
done when:     suite green, no `.py` in the diff, and at 390×844: the grid wraps to
               three columns at 114px tiles, thumbnails appear on an image folder, the
               view survives a reload, and on a volume started with `--no-thumb` every
               tile renders a served icon (`?th=` returns **200**, not 404) with no
               broken-image box and no console errors

### Card 4 — The folder-tree sheet
precondition:  Card 1 landed — third tenant of the multi-tenant `sheet()`, and `t()`.
               Card 2 landed if dotfiles are to be exercised (see below)
read for why:  spec §D4 — why lazy, and what is deliberately not built. Handoff
               `README.md:157-172`. **Spec 0002 §D3** — the widget's ownership
commits:
  1. nu: add the folder-tree sheet
     touches: copyparty/web/nu.html, copyparty/web/nu.css, copyparty/web/nu.js
     do:      - **read spec 0002 §D3 first.** If 0002's tree widget has already landed,
                this commit builds the sheet wrapper over it and nothing else. If not,
                the widget is written here — reader, `expanded{}` state, node render,
                current-path highlight — as a unit separable from its container, so
                0002 docks the same code instead of writing a second one
              - tapping the current folder name in the nav bar opens it (the `▾`
                affordance already drawn in the handoff, `README.md:94-95`); header is
                `Pastas` on the left and the full path truncated at 200px on the right
              - `GET <vpath>?tree=<top>` returns `{"a": [child dir names],
                "k<name>": {pre-expanded branch}}` (`tx_tree`, `httpcli.py:6062-6086`;
                `gen_tree`, `:6088-6169`). `top` must be `.` or a prefix of the request
                path or the server answers 422 (`:6068-6072`)
              - three response quirks, each a bug if missed: names are `quotep()`-encoded
                (`:6141`, `:6144`, `:6161`) and must be decoded for display but kept
                encoded in the href; with dirkeys a name arrives as `name?k=<hash>`
                (`:6140-6141`) and the key is part of the href or the folder is
                unreachable; a name with a **trailing newline** is a volume the server
                could not stat (`:6158-6160`) and renders as a disabled node, never as a
                name containing a line break
              - append `dots` to the tree url when the preference is on — `gen_tree`
                gates dot-dirs on `"dots" in self.uparam` *and* `udot`
                (`httpcli.py:6114`), exactly as the classic navpane does
                (`browser.js:7229`)
              - **only the chevron expands.** `▸`/`▾` sits in a hit area of
                `10 + 20 × depth` px, minimum 26px; the rest of the row **navigates**
                (`README.md:168-172`). Navigating auto-expands the destination's
                ancestors — which the response's `k<name>` keys already deliver for the
                path to `vpath`
              - **one fetch per expanded branch**, never a recursive prefetch — on a deep
                volume over a phone connection that is the difference between a sheet and
                a stall
              - the current node is marked (weight 700, accent text, `#e9e6f5` chip);
                navigation goes through `keep()` (nu.js:156) so the `?nu` mode survives —
                and `keep()` already appends `&nu` rather than `?nu` when the href
                carries a dirkey
done when:     suite green, no `.py` in the diff, and: the sheet opens from the title,
               tapping a **chevron** expands that branch with exactly one network request
               (devtools) while tapping the row's **name** navigates instead, the current
               folder is marked, arriving at a deep path paints its ancestors already
               open, navigating from the sheet lands in the new UI rather than the
               classic one, and on a `--dk` volume the navigated href still carries `?k=`

### Card 5 — Selection mode
precondition:  Card 1 landed — the selection action bar replaces the bottom bar's
               navigation slots, and Card 1 vacated the nav bar's right slot
read for why:  spec §D6 — why one file swipes without a dialog and N files confirm.
               Handoff `README.md:96-97`, `:108-111`, `:117-119`, `:141-142`
commits:
  1. nu: add selection mode with long-press
     touches: copyparty/web/nu.css, copyparty/web/nu.js
     do:      - `Selecionar` / `Concluir` in the nav bar's right slot, 14px/500, `--fg2`
                outside the mode and accent inside (`README.md:96-97`)
              - long-press 420ms enters the mode and marks the row, with
                `navigator.vibrate(12)` and a 6px movement cancel threshold
                (`README.md:243`)
              - the checkbox **container** animates width 0 → 30px
                (`transition: width .18s ease`) with a 22px circle inside it — the width
                is what animates, not opacity (`README.md:117-119`); selected rows take
                the `--sel` background the palette already defines (nu.css:20)
  2. nu: add select-all and invert to the status line
     touches: copyparty/web/nu.js
     do:      - in selection mode the status line's left side becomes "N selecionados"
                and its right side becomes `Tudo` / `Inverter` (`render_stat`,
                nu.js:244-259; `README.md:108-111`); both operate on `filtered()`, so
                they agree with the visible filter and search, never with `ST.items`
  3. nu: add the selection action bar
     touches: copyparty/web/nu.html, copyparty/web/nu.css, copyparty/web/nu.js
     do:      - the bottom bar swaps to `Baixar` / `Mover` / `Excluir`, all `flex:1`,
                with `Excluir` on `--danger` (nu.css:7) — the same component, a second
                slot set, not a second bar (`README.md:141-142`; 0002 §D5 keeps it one
                component at width too)
              - `Baixar` submits a hidden **form**, not an XHR: `POST <vpath>?zip[&k=]`,
                `enctype=multipart/form-data`, `target=_blank`, fields `act=zip` and
                `files` = the selected **basenames** newline-separated
                (`handle_zip_post`, `httpcli.py:3125-3148`; the classic UI's own shape,
                `browser.js:8891-8919`). An XHR would download into memory and hand the
                user nothing
              - `Excluir` posts **one** request: `POST <vpath>?delete` with the JSON list
                of selected vpaths (dispatch `httpcli.py:3190`, `handle_rm:6777`),
                behind a confirmation naming the count (spec §D6)
              - `Mover` lands as a **button only** — one request per selected item, and a
                folder source is a long abortable server-side walk (`up2k.py:4625-4658`),
                so the flow needs progress and cancellation and is deferred (see
                "Decisions pinned here"); tapping it says so rather than doing half a
                move
              - `Baixar`, `Mover` and `Excluir` gate on `srvcfg.have_zip` / `have_mv` /
                `have_del` and on `perms`; a server started `--no-del` shows no delete
done when:     suite green, no `.py` in the diff, and: long-press enters the mode and
               marks the row, a 7px drag during the press does **not**, `Tudo` and
               `Inverter` agree with the visible filter *and* the search box, deleting 3
               files issues exactly one request and refreshes the listing, `Baixar` on a
               2-file selection returns an archive containing exactly those two, and
               `--no-del` hides the delete button entirely

### Card 6 — Swipe actions and pull-to-refresh
precondition:  Card 5 landed — the swipe handler and the long-press handler share the
               same touch stream and must be written against each other
read for why:  handoff `README.md:237-251` for the exact thresholds; the spec adds
               nothing this card needs
commits:
  1. nu: add swipe actions on the row
     touches: copyparty/web/nu.css, copyparty/web/nu.js
     do:      - left swipe drags to −168px over a track (`#eceaf4`), revealing `Link`
                (84px) and `Excluir` (84px, `--danger`); release with `dx < −60` opens,
                otherwise it springs back to 0 (`README.md:244`)
              - `transform .22s cubic-bezier(.2,.9,.3,1)`, and **`none` while the finger
                is down** (`README.md:250`) — with the transition live the drag lags the
                finger
              - a tap with a row already open **closes it and does not activate the
                item** (`README.md:245`) — the single most likely mis-tap in the whole
                design
              - `Link` copies the file url; `Excluir` deletes that one file with no
                dialog, because the swipe itself is already two deliberate acts
  2. nu: add pull-to-refresh
     touches: copyparty/web/nu.css, copyparty/web/nu.js
     do:      - only when `scrollTop <= 0`; displacement × 0.5, capped at 72px; label
                flips from "Puxe para atualizar" to "Solte para atualizar" past 48px;
                release past 48 holds at 48 showing "Atualizando…" for **at least
                900ms** while `fetch_ls(location.pathname, …)` reruns and `take()`
                re-renders (`README.md:246`) — the floor is what keeps a fast LAN
                response from reading as a glitch
done when:     suite green, no `.py` in the diff, and the gesture matrix holds: a
               long-press does not open a swipe, a horizontal swipe does not scroll the
               list, a vertical drag from mid-list does not trigger the pull, a pull at
               the top does not open a swipe, and a tap on a row with another row open
               closes that row instead of opening a file

### Card 7 — The image viewer
precondition:  Card 1 landed
read for why:  handoff `README.md:224-234` for the layout; spec "Out of scope" for what
               is explicitly not in this card
commits:
  1. nu: add the image viewer
     touches: copyparty/web/nu.html, copyparty/web/nu.css, copyparty/web/nu.js
     do:      - tapping an image row or tile opens full screen at that index over
                `#0f0f14`
              - top bar: `Fechar` left (44px target), the file name 15px/600 with
                dimensions and meta 11px beneath it centered, and the counter `n / total`
                12px right. Middle: the image, `padding:12px`, radius 6. Footer: `‹` and
                `›` in 56 × 48 areas at the two ends, and `Baixar` / `Link` / `Excluir`
                centered on `#23232d` (`README.md:226-231`)
              - **prev/next are in the design and are built** — the viewer's list is the
                folder's images in visible order and prev/next **wrap around**
                (`README.md:232-233`). What is missing, per the coverage matrix, is
                **zoom, swipe between images and slideshow**; do not invent those here
              - loads the original file, not `?th=`
              - closing returns to the same scroll position
done when:     suite green, no `.py` in the diff, and: tapping an image opens the viewer
               at the right index with the right counter, `›` from the last image wraps
               to the first, delete removes the file and returns to a refreshed listing,
               and closing restores the previous scroll position

### Card 8 — Recursive search, and the doc catches up
precondition:  Card 1 landed — the placeholder is a translated string. Run last: the
               doc commit describes everything Cards 1-7 built
read for why:  spec §D5 — the gate, the rate limit, and why the promise is conditional
commits:
  1. nu: add recursive search on indexed volumes
     touches: copyparty/web/nu.js
     do:      - keep `filtered()` (nu.js:209) as the instant in-folder tier; it is the
                one that answers while you type
              - when `cfg.idx` is true (`"e2d" in vf`, `authsrv.py:3265`), submitting
                fires `POST <vpath>?srch` with `{"q": "...", "n": N}` (dispatch
                `httpcli.py:3184`; `n` is optional and defaults to `--srch-hits`,
                `:3305`; the classic UI's identical body shape is `browser.js:6702`),
                scoped to the current folder and below via the DSL's `path` keyword
                (`u2idx.py:272`), rendering the hits as a result list with their paths
              - fires **on submit, debounced, never per keystroke** — the server
                rate-limits consecutive searches with HTTP 429 when the previous query
                cost more than 0.7s and less than 0.7s of idle has passed
                (`handle_search`, `httpcli.py:3286-3291`) and that must surface as a
                readable message, not a silent empty result
              - when `cfg.idx` is false the placeholder keeps saying "in this folder" and
                **no request is ever issued** — an unindexed volume answers `?srch` with
                a 500 (`httpcli.py:3269-3272`)
  2. nu: bring docs/nu-ui.md up to what nu actually does
     touches: docs/nu-ui.md
     do:      - `docs/nu-ui.md` still says selection, swipe, pull-to-refresh, grid, the
                tree sheet, the overflow menu, settings and the viewer are "Not built,
                and therefore still reasons to reach for `classic UI`". After Card 7 that
                paragraph is false in eight places. Rewrite "Built so far", "what is NOT
                built yet" and the escape-hatch section (the `classic` link now lives in
                the `⋯`) to match the tree
              - the file is the only prose a reader meets before the code; leaving it
                stale is how the next spec re-derives a solved problem
done when:     suite green, no `.py` in the diff, and: on an `-e2dsa` volume, submitting
               a query finds a file two folders down and tapping a hit navigates to it;
               two submits in immediate succession surface the 429 as a message rather
               than as an empty list; on a volume with no index the placeholder does not
               promise recursion and devtools records **zero** `?srch` requests; and
               `docs/nu-ui.md` names nothing as missing that Cards 1-7 built

## Verification (mirrors the spec's §Verification)

Run after Card 8, as the whole-plan check:

- **No server drift.** `git diff 0affcaee..HEAD -- 'copyparty/*.py'` is empty. The one
  template variable the spec allowed turned out to be unnecessary (`cgv1` is already
  passed at `httpcli.py:7333`), so the correct diff is zero Python.
- **The dotfile trap.** Card 2's gate, re-run after everything else landed.
- **The unindexed volume.** Search promises nothing, folder rows degrade to date only
  (`nfiles()`, nu.js:58), thumbnails fall back to the served icon.
- **The default install is clean.** With no `--lang`, the network log shows no 404 —
  the `tl/{{ lang }}.js` tag is guarded, because there is no `web/tl/eng.js`.
- **The classic UI is untouched.** `?b` reaches the basic browser, `?nu0` escapes, the
  `classic` link in the `⋯` still unpins the `ui=nu` cookie, and no file under
  `copyparty/web/` other than `nu.*` appears in the diff.
- **No new files under `web/`.** Every card edits `nu.js` / `nu.css` / `nu.html`. If a
  card ever adds a file there, it must also be added to `RES`
  (`copyparty/__init__.py:101-103` is where the `nu.*` entries live) **and**
  `scripts/sfx.ls` (`:105-107`), or it will 404 in dev and vanish from the sfx build.
- **The 0002 contract is still just a contract.** No card here added a `min-width`
  branch or a second renderer; the wide band is 0002's to build.
- **Suite:** `python3 -m unittest discover -s tests` green (31 tests at `deca3c68`).
