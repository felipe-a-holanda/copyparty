---
number: 0001
type: plan
slug: nu-the-rest-of-the-mobile-design
title: "The rest of the mobile design: nu beyond the base layer"
status: pousado
created: 2026-08-23
tags: [plan, status/pousado]
par: "[[specs/0001-nu-the-rest-of-the-mobile-design|spec]]"
---

**Re-planned:** 2026-08-23 against `decdcbca`, after spec 0002 landed. This
supersedes the version hardened against `deca3c68`; that text was written when
`nu` had no tree reader, no `t()` shim, no `srvcfg` and one viewport. Do **not**
execute a card from the pre-0002 file — `docs/nu-ui.md:200-208` says the same thing
from the other side.

> Eight sessions that take `nu` from "a list you can look at and drive with a mouse"
> to "a phone you can actually work from — that is still a desktop app at 1440px".
> No new route, no new parameter, no new response field.

## Context

`nu` is the second filebrowser UI (`docs/nu-ui.md`). Two slices are landed:

- the **base layer** (`0affcaee`) — list, row, navigation, sticky header, sort sheet;
- **spec 0002** (`403b87c5..0418a0a3`) — the three width bands, the field-split row and
  its column grid, the column header, the `?tree=` reader and its wide dock, and
  desktop input (hover, focus ring, arrow/Home/End, Escape, right-click menu).

Spec 0001 scopes the seven surfaces the mobile design specifies that neither slice
built, plus the recursive tier of search. Upload is deferred to its own spec (0001 §D2).

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

## What 0002 landed, and what it changes in this plan

The pendency list 0002 left for exactly this re-plan is
`docs/plans/0002-nu-desktop-is-a-first-class-width.md:666-689`. Consumed card by card,
it produced these deltas — nothing else in this file moved:

- **Card 1 loses a commit and gains a bullet.** `srvcfg = {{ cgv1 }}` is already bound,
  raw, in `nu.html:88-96`; the old commit 2 is now a verification line. Commit 1 gains
  the lift of 0002's `STR` table (`nu.js:34-40`) into `Ls.eng` and the replacement of
  `t()`'s body (`:42-44`) with the per-key fallback.
- **Card 4 loses the widget.** `tree_load()`, `tree_first()`, `tree_expand()`,
  `render_tree(el)` and the node model all landed (`nu.js:775-1112`), and
  `render_tree()` already takes its container as an argument for this card's sake
  (`nu.js:967-972`). Card 4 builds the sheet wrapper, and nothing else.
- **Every card gains a wide clause and a second viewport.** The plan-level gate rule
  was "a named, falsifiable manual check at 390×844"; it is now **390×844 *and*
  1440×900**, card by card.
- **The action bar is one component with two placements.** The wide slot is declared
  and empty: `#nu_tools` in the status line (`nu.html:36-45`, CSS at `nu.css:329-331`
  and `:928`). Not a second bar with its own strings.
- **Gestures are gated in JS, by capability, not by width.** `CAP` (`nu.js:231-275`)
  already exposes `coarse` / `fine` / `wide` and re-reads each on `mq.onchange`.
  Cards 5 and 6 install their handlers through it and re-bind on the flip — a CSS-only
  gate hides the affordance and leaves the listener attached, which is the bug `CAP`
  exists to prevent.

Single lane still: every card edits `copyparty/web/nu.js`, `nu.css` and `nu.html`.

## Decisions pinned here (open questions from spec §Open questions)

- **Move's destination picker.** Confirmed: the tree widget (now 0002's) is the
  widget, in a "pick a folder" mode. But the *flow* stays deferred — Card 5 lands the
  `Mover` button only, for two reasons. `?move=` takes **one source per request**
  (`POST <src>?move=<dst>`, dst being the full destination path including filename), so
  N selected items are N requests with N partial-failure states and no batch endpoint to
  lean on. And a folder source is a **long, abortable** operation: `up2k.handle_mv`
  (`copyparty/up2k.py:4590`) walks the whole tree server-side when the source is a
  directory (`:4625-4658`), checking an abort key after every file (`:4650`), which is
  what `?fs_abrt` (`httpcli.py:6873`) exists for. So the flow needs progress and
  cancellation, not just a destination picker. That is a flow to design, not a button to
  wire.

- **Density toggle: a settings row that writes one attribute.** The handoff gives the
  compact metric exactly once — `padding:14px 16px` for the touch row, `9px 16px`
  compact (`README.md:114-115`) — and names **no** switch for it. Settings is the only
  plausible home. **0002 already built the mechanism**: `.nu_row` reads
  `var(--row-pad, 14px 16px)` (`nu.css:367`), the wide band redefines `--row-pad` to the
  compact metric on `:root` (`:838`), and `:root[data-dens="touch"]` (`:404-406`)
  overrides it back by specificity. So the toggle writes `data-dens` on
  `documentElement` and **never touches `.nu_row`**.

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
  read at boot (`nu.js:1117-1123`).

- **The header's right slot has to be vacated before Card 5 can use it.** The design
  puts `Selecionar` / `Concluir` in the nav bar's right slot (`README.md:96-97`); today
  that slot holds the `classic` escape link (`nu.html:23`, `#nu_old`, pushed right by
  `margin-left:auto` in the wide band, `nu.css:884-886`). So Card 1 moves the escape
  hatch into the `⋯` — which is also where spec 0001 §D2 routes the disabled upload
  button — and Card 5 then owns the slot. The hatch must never become unreachable:
  `docs/nu-ui.md:26-32` guarantees it in both directions, and `unpin()` (`nu.js:204`)
  is what makes it survive a reload when the `ui=nu` cookie is set. 0002's context-menu
  row `ctx_old` (`nu.js:604-616`) does **not** depend on the element — it navigates to
  `?nu0` directly — so moving `#nu_old` does not break it; what it does not do is
  unpin, which is why the visible door still has to exist.

- **Accent is a hue, not a colour.** The handoff's four swatches are one lightness and
  one chroma with four hues — 300 (default), 250, 160, 60 — and it says so explicitly
  ("Todos os acentos compartilham lightness e chroma; só o hue muda. Trocar acento não
  deve exigir mais nada", `README.md:297-298`). `nu.css` defines `--accent` **three**
  times — light (`:6`), OS-dark (`:72`) and manual dark (`:105`) — plus `--ring` three
  times at the same three places (`:24`, `:69`, `:102`), which is the same hue wearing a
  different lightness. The picker sets a hue variable that all six definitions consume;
  it never sets `--accent` itself.

- **A theme control is beyond the handoff, and lands anyway.** §6's four groups are
  Exibição / Tamanhos / Aparência / Conta, with **no theme row**; the coverage matrix
  scores "Temas (10 variantes)" as `Não migrado`. But the base layer already shipped a
  full dark palette — OS-dark under `:root:not([data-thm="light"])` (`nu.css:55-87`) and
  a manual `:root[data-thm="dark"]` (`:89-106`), which between them already implement
  light / dark / system — and a boot read of a stored `nu_thm` (`nu.js:1117-1123`) that
  **nothing writes**. Either that code is dead or something switches it. Card 2 adds the
  switch, as a named addition to the design, not as a silent one. The CSS needs no
  change: the row only writes `data-thm`.

## What the investigation changed about the shape

Six findings move work between cards or change how a commit is written. All six are
load-bearing, and four of them are new since the pre-0002 plan.

### `var t` in the boot IIFE shadows `t()` — Card 1 walks into this on its first line

The boot block reads the stored theme into a local named `t`
(`var t = localStorage.getItem("nu_thm")`, `nu.js:1121`). `var` is function-scoped and
hoisted, so **for the entire boot IIFE the identifier `t` is a string, not the
translator** — a `t("...")` call anywhere inside it throws `t is not a function`, and
it throws at the top of the block too, before the assignment, because the hoisted
binding is already shadowing.

Card 1 fills `nu.html`'s three static strings from `t()` **at boot**, which is exactly
inside that IIFE. So the first thing that commit does is rename the local (`thm`).
This is a two-character bug that costs a debug cycle if it is met at runtime instead
of read here.

### `srvcfg` is bound; `cgv1` is closed as a question

0002 Card 4 commit 3 landed `srvcfg = {{ cgv1 }}` in `nu.html`'s bootstrap block
(`nu.html:88-96`), **raw**, with the reason in a comment: `vn.js_htm` is already a JSON
*string* (`authsrv.py:3358`, `json_hesc(json.dumps(...))`), which is why every other
template interpolates it bare (`browser.html:140`, `md.html:138`, `mde.html:35`);
`|tojson` would hand `nu` a `String` and every capability gate would read `undefined`.

So the later cards already have `have_shr`, `have_zip`, `have_mv`, `have_del`,
`ext_th`, `see_dots`, `ui_notree` and `ui_noctxb`. Permissions are bound too — `perms`
(`nu.html:99`, from `cgv.perms`, `httpcli.py:7269-7285`) carries `read`, `write`,
`move`, `delete`, `dot`, `get`, `upget` and `admin` — so every destructive control and
the dotfile row gates client-side with no roundtrip.

The spec's escape clause ("if a commit edits `httpcli.py` beyond a template variable,
stop") therefore tightens to **zero**: any `.py` diff in this plan is a signal to stop.

### The classic UI's i18n breaks the moment `nu` adds a key — and `nu` cannot just copy the wiring

`browser.js:716` resolves the language **whole-object**:

```javascript
var L = Ls[lang] || Ls.eng, LANGS = [];
```

The 22 files under `copyparty/web/tl/` each set `Ls.<lang> = {...}` keyed to
`browser.js`'s namespace (`browser.js:11`, `Ls.eng = {`). A `por` user gets `Ls.por` —
which contains none of `nu`'s keys. There is **no per-key fallback**, so every new key
renders `undefined`, in every language except English, silently.

This is why i18n is in **Card 1** rather than last. 0002 anticipated it and left the
shape ready: a `STR` table (`nu.js:34-40`) with its five keys and a `t(k)` shim whose
whole body is `return STR[k] || k` (`:42-44`), with every string 0002 added already
routed through it. So the lift is a rename plus a body swap, **not** a hunt for
literals — the literals that remain are the base layer's own, enumerated in Card 1.

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

### The tree caches, and `dots` is baked into that cache — so Card 2 owes the tree an invalidation

`tree_dots()` (`nu.js:775-777`) reads the **cookie** `dots=y` today, because at 0002's
time there was no preference to read. Card 2 repoints it at the preference. But the
widget also **caches**: `node.kids` survives a collapse on purpose (`tree_toggle`,
`nu.js:1063-1068`) and `ST.tree.root` is fetched once behind `tree_lit`
(`nu.js:1096-1112`). So flipping the dotfiles toggle with a tree already on screen
leaves every loaded branch showing the *old* answer, and only branches expanded after
the flip get the new one — a tree that disagrees with itself, silently.

The rule: the dotfiles toggle **resets** `ST.tree.root = null`, `ST.tree.expanded = {}`
and `tree_lit = false`, then re-runs the boot path for whichever container is mounted.
One preference, two readers, one invalidation.

### `tree_lit` is a load flag wearing a mount flag's clothes — Card 4 has to split them

`tree_boot()` (`nu.js:1098`) does three things behind one flag: it marks the fetch as
started, it renders into `ebi("nu_tree")`, and it docks. At `< 64em` it is never called
(`nu.js:1256-1261` subscribes it to `CAP.wide`), so today the flag is honest.

The moment Card 4's sheet calls it at phone width, it stops being honest: the sheet's
fetch sets `tree_lit`, and a later resize past 64em finds `tree_boot()` returning early
— **the dock never renders and never docks**, on a tree that is already in memory.

So Card 4 splits the flag from the mount: one loader (`ST.tree.root` is the cache, and
a request is in flight at most once), and a mount step per container. The dock keeps
`tree_dock()` as its own second half; the sheet's second half is opening the sheet.

### The fixed bottom bar lands under `#nu_foot`, not under `#nu_main`

`#nu_main` carries `padding-bottom: calc(28px + env(safe-area-inset-bottom))`
(`nu.css:345-347`) — but `#nu_foot` (`nu.html:79-81`, the `srv_info` line) is a sibling
**after** `#nu_shell`, so it is the last thing in the scroll, and a bar fixed to the
viewport bottom covers it, not the last row. Raising `#nu_main`'s padding, which is
what the pre-0002 plan said, clears nothing.

The clearance belongs to `#nu_foot`, and it is **narrow-only**: at `>= 64em` the bar is
`#nu_tools` in the header and there is no fixed element to clear.

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
asserts what is actually observable.

### `sheet()` is still single-tenant, and Cards 1, 2 and 4 each add a tenant

0002 did not touch it. `sheet(on)` (`nu.js:546-570`) is hardcoded to `ebi("nu_sheet")` /
`ebi("nu_veil")`, `render_sheet()` is hardcoded to `ebi("nu_sopts")`, `ST.sheet` is one
boolean (`nu.js:182`), the veil's click handler closes that one sheet
(`nu.js:1172`), the `Escape` branch tests that one boolean (`nu.js:1193-1194`) and the
280ms teardown re-tests it (`:566-569`). Open a second sheet inside that window and the
first sheet's timer hides the second one.

So Card 1's "reuse the sheet machinery" is really **generalize it first**: `sheet(id,
on)` over a `ST.sheet` that holds an id or `null`. The synchronous-reflow line and the
comment explaining why it is not `requestAnimationFrame` survive verbatim. This is the
first sheet commit of Card 1, and Cards 2 and 4 depend on it.

## The endpoints each card talks to (all pre-existing)

| surface | request |
|---|---|
| new folder | `POST <vpath>` multipart, `act=mkdir` + `name` (dispatch `httpcli.py:3101`, `handle_mkdir:3736`) |
| folder tree | `GET <vpath>?tree=<top>[&dots][&k=]` → `{"a": [names], "k<name>": {nested}}` (`tx_tree:6062`, `gen_tree:6088-6169`) — **already wired**, `tree_load()`, `nu.js:793` |
| delete | `POST <vpath>?delete` + JSON list of vpaths (dispatch `:3190`, `handle_rm:6777`) — one request for N files |
| download a selection | `POST <vpath>?zip[=fmt][&k=]` multipart form, `act=zip` + `files` = newline-separated basenames (dispatch `:3114`, `handle_zip_post:3125-3148`); a **form submit**, not XHR, because the browser has to receive the download (`browser.js:8891-8919`) |
| move | `POST <src>?move=<dst>` (`handle_mv:6808`) — one request per **item**; a folder source is walked server-side (`up2k.py:4625-4658`), so a whole tree is still one request |
| abort a move | `POST <vpath>?fs_abrt=<akey>` (`handle_fs_abrt:6873`) — folder moves check the key after every file (`up2k.py:4650`) |
| thumbnails | `GET <file>?th=x\|w\|j` (+`f` no-crop, +`3` hi-res) as in `browser.js:5870-5882`, format from the probes at `browser.js:1244-1245`; never 404s (see above) |
| recursive search | `POST <vpath>?srch` + `{"q": "...", "n": N}` (dispatch `:3184`, `handle_search:3267`, `n` optional and defaulted at `:3305`), `path` keyword in the DSL (`u2idx.py:272`) |
| dotfiles | `dots` in the **query string** of every `?ls` and every `?tree` |
| cookie writes | `GET ?setck=<k>=<v>` (`setck:5913`) — `k=v` capped at 9 chars (`:5915`); an empty value expires the cookie (`:5918`) |

## Sessions  ·  one card = one fresh session; a card may land several commits; git carries state between cards

Single lane: every card edits `copyparty/web/nu.js`, `nu.css` and `nu.html`, so the
touches collide by construction and the cards run in sequence. No `lane:` stamps.

There is no JS test harness in this repo, so each card's gate is the Python suite
(proves nothing regressed) **plus named, falsifiable manual checks at 390×844 *and*
1440×900** — the second viewport is 0002's contract, and a card that only checks the
phone is a card that ships a broken desktop. Serve a test volume with `-e2dsa` so
indexed-only behavior is exercised.

### Card 1 — The shell: i18n, bottom bar, and the ⋯ router
precondition:  none — first card
read for why:  `docs/specs/0001-nu-the-rest-of-the-mobile-design.md` §D1 (why the ⋯ is
               a router) and §D2 (why upload is a disabled button, not a hidden one);
               `docs/plans/0002-...:666-689` row 1 (what 0002 leaves this card);
               handoff `README.md:36-38` (every string goes through i18n),
               `:136-142` (the bar), `:184-195` (the menu)
model:         opus
commits:
  1. nu: route strings through the existing i18n, with a per-key fallback
     touches: copyparty/web/nu.html, copyparty/web/nu.js  (only these)
     do:      - **rename the boot block's `var t`** (`nu.js:1121`, the stored-theme
                read) to `thm` FIRST. `var` is function-scoped and hoisted, so it
                shadows `t()` for the whole boot IIFE — and this commit calls `t()`
                inside it
              - declare `var Ls = {}` in nu.html's existing bootstrap script block,
                **before** the tl tag: `Ls` lives in `util.js:310-311`, and `nu` does
                not load util.js (2415 lines, installs `window.onerror` at import,
                `util.js:307`)
              - emit `<script src=".cpr/w/tl/{{ lang }}.js">` the way
                `browser.html:155` does, but **guarded on `lang != "eng"`** — there is
                no `web/tl/eng.js` (`copyparty/__init__.py:116-137` lists chi..vie) and
                `--lang` defaults to `eng` (`__main__.py:1974`), so an unguarded tag
                404s on every default install
              - lift 0002's `STR` table (`nu.js:34-40`) into `Ls.eng` verbatim — the
                five keys `tree_h`, `tree_gone`, `ctx_open`, `ctx_dl`, `ctx_old` — and
                replace `t()`'s body (`:42-44`) with
                `return (L && L[k]) || Ls.eng[k] || k`, where `var L = Ls[lang]`. That
                is the per-key fallback the classic UI lacks (`browser.js:716` is
                whole-object, so a `por` user would get `undefined` for every key the
                22 tl files do not carry)
              - move the base layer's remaining literals through `t()`. In nu.js: the
                filter chip labels (`FILTERS`, :158), the sort labels and hints
                (`SORTS`, :168), the status line's `item`/`items` (`render_stat`, :369),
                the row's `item`/`items` for a folder's count (`render_list`, :490), the
                Back row's `Back` / `parent folder` (:472-478), the two empty states
                `nothing matches` / `this folder is empty` (:517-519) and the boot error
                `could not load listing` / `try the classic UI` (:1300-1302). In
                nu.html: the search placeholder (:29), the sort sheet's
                `<h2>Sort by</h2>` (:74) and its `tap again to reverse` hint (:75), and
                the `classic` link (:23) — the static ones get ids and are filled from
                `t()` at boot, since jinja cannot see `Ls`
              - `SORTS`' labels are read by three callers now — the sheet
                (`render_sheet`, :532), the status line (`sort_label`, :376) and
                **0002's column header** (`render_head`, :419, which deliberately adds
                no string of its own). Translating the table translates all three; do
                not add a fourth source
              - reuse an existing tl key wherever the classic UI already ships the same
                string; only genuinely new strings get new `Ls.eng` keys
  2. nu: make the sheet machinery multi-tenant
     touches: copyparty/web/nu.js
     do:      - `sheet(id, on)` and `ST.sheet` (:182) holding an open sheet's id or
                `null`, replacing the single boolean and the hardcoded
                `ebi("nu_sheet")` / `ebi("nu_sopts")` (:532-570)
              - the veil's click (:1172) and the `Escape` branch (:1191-1197) close
                whatever is open; the 280ms teardown must check that *this* sheet is
                still the closed one, or a sheet opened inside that window gets hidden
                by its predecessor's timer
              - keep the synchronous-reflow line and its comment verbatim — the reason
                it is not `requestAnimationFrame` has not changed
  3. nu: add the action bar, in both of its placements
     touches: copyparty/web/nu.html, copyparty/web/nu.css, copyparty/web/nu.js
     do:      - **one component, two placements** (0002 §D5): rendered into the fixed
                bottom bar below 64em and into the declared-and-empty `#nu_tools` slot
                (`nu.html:36-45`) at and above it. One render function, one set of i18n
                keys, one set of handlers — not a second bar
              - narrow, per `README.md:136-142`: `Enviar arquivos` (`flex:1.4`, accent
                bg, 15px/600), `Nova pasta` (`flex:1`, `--fill`, 14px/500), `⋯` (48px
                fixed, `--fill`, 18px); container `--foot-bg` (nu.css:39) + blur 12px,
                top border `--line`, `padding:8px 12px 22px`, `gap:8px`, buttons
                `min-height:48px` `border-radius:14px`
              - wide: compact buttons in the status line's slot. `#nu_tools:empty`
                (`nu.css:329-331`) stops matching the moment the slot has content, which
                is what re-enters it into `#nu_acts`' flex gap — that rule is why the
                empty slot has cost zero pixels until now; do not remove it
              - the bar is fixed to the bottom and carries `env(safe-area-inset-bottom)`
                itself. **The clearance goes on `#nu_foot`, not `#nu_main`**: `#nu_foot`
                (`nu.html:79-81`) is a sibling after `#nu_shell`, so it is what the
                fixed bar covers; `#nu_main`'s existing `padding-bottom`
                (`nu.css:345-347`) clears nothing. Narrow-only — at `>= 64em` there is
                no fixed bar to clear
              - `Nova pasta` posts multipart `act=mkdir` + `name` to the current vpath,
                then re-renders via `fetch_ls(location.pathname, function (err, ls) { if
                (!err) take(ls); })` — `fetch_ls` (nu.js:737) is callback-only and does
                not call `take()` itself; shown only when `perms` contains `write`
              - `Enviar arquivos` renders **disabled** and routes to the classic UI on
                tap (spec §D2) — a dead button that explains itself, not a hidden one
                that makes the UI look finished
  4. nu: add the overflow menu as an extensible router
     touches: copyparty/web/nu.html, copyparty/web/nu.css, copyparty/web/nu.js
     do:      - a second tenant of commit 2's `sheet()`, `max-height:560px`, section
                headers 11px/700 and rows `min-height:50px` with a right-aligned meta
                and a `›` (`README.md:186-188`)
              - render from a declarative `MENU` table (key, label key, meta key,
                enabled predicate, handler) grouped into the design's two sections,
                `NESTA PASTA` and `SERVIDOR` (`:190-193`) — the same shape 0002's `CTX`
                table already uses (`nu.js:604-618`), so a later spec adds a row rather
                than redesigning the sheet (spec §D1)
              - the design's seven rows are `Nova nota .md`, `Enviar mensagem pro log`,
                `Desfazer upload recente` (meta `unpost`), `Uploads recentes`,
                `Compartilhamentos`, `Configurações`, `Control panel`. Spec 0001 defers
                all of them except `Configurações` (Card 2). They are declared in the
                table and rendered **disabled**, so the router's shape is right the
                first time and a later spec flips a predicate
              - **move the `classic` escape hatch here** from the nav bar's right slot
                (`nu.html:23`), which the design assigns to `Selecionar` / `Concluir`
                (`README.md:96-97`) and Card 5 needs. It becomes a `MENU` **row with a
                handler**, not a moved element with a boot-time binding: the sheet
                renders from the table, so `#nu_old`'s `esc_a.onclick` (`nu.js:1139-
                1141`) would be destroyed on the first re-render. The handler is the same
                logic — `unpin()` when `STICKY`, otherwise navigate to
                `location.pathname + "?nu0"` — because the classic UI strips the query
                and a bare `?nu0` does not survive a reload (`docs/nu-ui.md:26-32`)
              - 0002's `ctx_old` row (`nu.js:604-616`) navigates to `?nu0` on its own and
                does **not** read `#nu_old`, so it keeps working; it is an accelerator,
                and this row is the visible door it accelerates
              - entries gate on `srvcfg` and `perms`; at `>= 64em` the `⋯` is the slot's
                last button, same table, same sheet
done when:     `python3 -m unittest discover -s tests` green (31 tests at `decdcbca`),
               **no `.py` file in the diff**, and —
               at 390×844: the bar renders fixed above the list, the `srv_info` footer
               is fully scrollable into view above it, `Nova pasta` creates a folder and
               the listing refreshes without a page load, `⋯` opens and closes on the
               veil, opening the sort sheet within 280ms of closing the `⋯` leaves the
               sort sheet visible, and the `classic` row is reachable from the `⋯` and
               still unpins the `ui=nu` cookie;
               at 1440×900: the same buttons render in `#nu_tools` beside the sort
               button with **no fixed bar anywhere**, and the status line does not jump
               (the `:empty` rule stopped applying, it was not deleted);
               both widths: after `?setck=cplng=por` the page shows Portuguese where a
               key exists and **English, never `undefined`**, where it does not — with
               **zero 404s in the network log** on a default (`--lang eng`) server, and
               0002's column header labels translate with the sheet's

### Card 2 — Preferences and the settings screen
precondition:  Card 1 landed — the ⋯ is where Settings is reached from, `sheet()` is
               multi-tenant, and `t()` must exist before this card adds ~25 strings
read for why:  spec §D3 in full. This is the card with the silent failure mode; the
               section explains it and the gate below is the check that catches it.
               `docs/plans/0002-...:666-689` row 2. Handoff `README.md:197-222` for the
               screen, `:293-298` for the accent
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
                `nu_dens`, `nu_grid`, `nu_acch`, plus the existing `nu_thm`
              - seed from `cfg` (`vn.js_ls`, `authsrv.py:3264-3282`). Note what is
                already wired: `cfg.dsort` is honoured at boot (nu.js:1127-1132) and
                `cfg.dnsort` already feeds `cmp_name` (`:294-298`) — those two become
                *user-overridable*, they are not new reads. Genuinely unread today are
                `cfg.dgrid` (:3268), `cfg.dcrop` (:3272) and `cfg.dth3x` (:3273), which
                Card 3 consumes
              - replace the constants the base layer really did hardcode: `dir1st`
                (nu.js:292) and the fixed unit table `UNITS` (`:110`) that `humansize()`
                (`:112`) walks — Auto / Decimal (1000) / Binário (1024) per
                `README.md:208`
              - `humansize()` has **three** callers now, not one: the row's file size
                and a folder's wide-band size (`render_list`, :489-492) and the status
                line's total (`render_stat`, :369). Changing the unit table changes all
                three, which is correct — but the folder cell's narrow form is an item
                count, not a size, and must not be reformatted
  2. nu: send dots on every listing fetch, and invalidate the tree when it flips
     touches: copyparty/web/nu.js
     do:      - append `dots` to the url built in `fetch_ls()` (nu.js:737) when the
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
              - repoint `tree_dots()` (nu.js:775-777) from the cookie to the
                preference — the tree honours **only** the query param, ANDed with
                `udot` (`httpcli.py:6114`), so it needs the client's own answer
              - **invalidate the tree on the flip**: `node.kids` survives a collapse
                (`tree_toggle`, :1063-1068) and `ST.tree.root` is fetched once behind
                `tree_lit` (:1096), so branches loaded before the toggle keep showing
                the old answer while branches opened after show the new one. Reset
                `ST.tree.root`, `ST.tree.expanded` and the load flag, then re-run the
                mount for whichever container is showing
              - gate the whole feature on `perms` containing `dot`; hide the row rather
                than showing it inert
  3. nu: add the settings screen
     touches: copyparty/web/nu.html, copyparty/web/nu.css, copyparty/web/nu.js
     do:      - full screen off the ⋯ (`README.md:199-204`): own header with `‹` back,
                centered title, scrollable body `padding:16px 16px 40px`; uppercase
                group labels; cards `--surface` radius 14; rows `min-height:52px`
              - **at `>= 64em` it is a centered panel, not a full-bleed sheet** (0002
                §D5) — same markup, a width query, `max-width` around 560px with the
                veil behind it
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
                Exibição and a `Tema` row (light / dark / system) in Aparência
              - the density row **writes `data-dens` on `documentElement` and nothing
                else**. 0002 owns the mechanism: `.nu_row` reads `var(--row-pad, 14px
                16px)` (`nu.css:367`), the wide band redefines `--row-pad` compact on
                `:root` (`:838`), and `:root[data-dens="touch"]` (`:404-406`) overrides
                it back. Restyling `.nu_row` here would fight that by specificity
              - the theme row **writes `nu_thm` and `data-thm`, and touches no CSS**:
                `:root:not([data-thm="light"])` under `prefers-color-scheme: dark`
                (`nu.css:55-87`) plus `:root[data-thm="dark"]` (`:89-106`) already
                implement all three states; the boot read exists (`nu.js:1117-1123`) and
                nothing writes it
              - the accent picker writes a **hue**, not a colour: the four swatches are
                hues 300 / 250 / 160 / 60 at the shared lightness and chroma
                (`README.md:297-298`). `--accent` is defined three times (`nu.css:6`,
                `:72`, `:105`) and `--ring` three times (`:24`, `:69`, `:102`) —
                refactor all six to consume a `--acc-h` custom property and set only
                that, or the dark theme and the focus ring keep the default hue
              - controls per `README.md:213-218`: toggle 44 × 26 radius 13 with a 22px
                knob; segmented track `--fill` radius 10; swatch 26px with a 2px border,
                `--fg` on the selected one
done when:     suite green, no `.py` in the diff, and —
               **the trap check**: with a user holding `udot`, turn hidden files on,
               confirm dotfiles appear, then **navigate into a subfolder and back** and
               confirm they are still there (a cookie-only implementation passes
               everything else and fails exactly here);
               **the tree trap**: at 1440×900 with the dock open and a branch already
               expanded, flipping hidden files updates **that** branch too, not only
               branches opened afterwards;
               every preference survives a reload and the first paint already matches it
               before any refetch; `dir1st` set in the classic UI is already on when
               `nu` first opens, and the reverse, proving the shared keys;
               picking a non-default accent and switching the theme to dark keeps that
               accent, and the focus ring moves with it;
               at 1440×900 the settings screen is a centered panel, and toggling density
               to `touch` restores the 14px row **at that width** without any change to
               `.nu_row`'s own rule

### Card 3 — Grid view and thumbnails
precondition:  Card 2 landed — grid, thumbnails and crop are preferences, and their
               defaults come from `cfg.dgrid` / `cfg.dcrop` / `cfg.dth3x`
read for why:  spec §D7 — short; it explains why no server capability is negotiated.
               `docs/plans/0002-...:666-689` row 3. Handoff `README.md:144-155`
model:         opus
commits:
  1. nu: add grid view as a second renderer
     touches: copyparty/web/nu.html, copyparty/web/nu.css, copyparty/web/nu.js
     do:      - a `render_grid(shown)` beside `render_list` (nu.js:465), fed by the same
                `filtered()` output — a second renderer, not a second data path. This
                is the **one sanctioned exception** to "one markup, one renderer"
                (`docs/nu-ui.md:91-96`): a different presentation of the data, not a
                different width of the same presentation. It must not introduce a second
                *row* markup, and `draw()` (:520) stays the single caller
              - `flex-wrap` with `gap:6px`, `padding:8px 12px 120px` (the 120px is
                clearance for Card 1's bar), tiles 114 × 114 radius 12
                (`README.md:145-146`). The design does not state a column count; 114 × 3
                + 6 × 2 = 354 inside 390 − 24 of padding, so three columns fall out of
                the tile size at the design width and must not be hardcoded as a count
              - **a wide tile size** (0002 §D5): 114px is a phone tile. The tiles fill
                the wide band's capped content column (`100em`, flush left) — same
                wrap, a larger tile, declared in the existing `>= 64em` query
              - the column header (`#nu_head`) is a list affordance: hide it in grid
                mode at every width, and leave `#nu_sort` and the sheet reachable — the
                sort still applies, the columns just are not on screen
              - each tile: extension badge top-left (mono 9px, `letter-spacing:.08em`,
                on `rgba(255,255,255,.72)`), name footer 11px/500 truncated on
                `rgba(251,251,253,.88)`, and a slot top-right for Card 5's 22px checkbox
                (`README.md:151-155`). Folder and file placeholder fills per `:146-150`
              - the Grade/Lista control in the status line (`render_stat`, :363) and a
                mirror entry in the ⋯
  2. nu: add thumbnails to the grid
     touches: copyparty/web/nu.js, copyparty/web/nu.css
     do:      - `?th=` with the format chosen by browser probe (jxl `x`, webp `w`, else
                `j`), `f` when not cropping, `3` on hi-dpi — same negotiation as
                `browser.js:5870-5882`, with the support probes of `browser.js:1244-1245`
              - honour `srvcfg.ext_th` (per-extension icon overrides,
                `authsrv.py:3302`) before falling back to a thumb request, as
                `browser.js:5870-5872` does. `srvcfg` is already bound (`nu.html:88-96`)
              - keep an `onerror` fallback to the placeholder fill for genuine transport
                failure, but do **not** rely on it to detect a thumbless volume: `?th=`
                returns 200 with a server-rendered icon in that case
                (`tx_ico`, `httpcli.py:7133`), and 200 with an error SVG on a failed
                conversion (`:7120-7122`)
done when:     suite green, no `.py` in the diff, and —
               at 390×844: the grid wraps to three columns at 114px tiles, thumbnails
               appear on an image folder, the view survives a reload;
               at 1440×900: the tiles are the wide size and fill the capped column
               rather than three lonely phone tiles, and the column header is gone while
               `#nu_sort` still sorts;
               a resize 1440 → 390 → 1440 in grid mode reflows without a refetch and
               keeps the sort, the filter and the search text;
               on a volume started with `--no-thumb` every tile renders a served icon
               (`?th=` returns **200**, not 404) with no broken-image box and no console
               errors

### Card 4 — The folder-tree sheet
precondition:  Card 1 landed — third tenant of the multi-tenant `sheet()`, and `t()`.
               Card 2 landed if dotfiles are to be exercised
read for why:  spec §D4 — why lazy, and what is deliberately not built.
               **`docs/specs/0002-...` §D3** — the widget's ownership and its seven
               wire-shape quirks, all of them already handled in `nu.js:793-1020`.
               `docs/plans/0002-...:666-689` row 4. Handoff `README.md:157-172`
model:         opus
commits:
  1. nu: mount the tree once, into whichever container is showing
     touches: copyparty/web/nu.js
     do:      - split `tree_boot()` (`nu.js:1098-1112`) into a **loader** and a
                **mount**. Today one flag (`tree_lit`, :1096) means all three of "the
                fetch started", "the dock is rendered" and "the dock is docked". The
                moment this card's sheet loads the tree at phone width, a later resize
                past 64em finds `tree_boot()` returning early and the dock **never
                renders and never docks**, on a tree that is already in memory
              - the loader: at most one `tree_first()` in flight, `ST.tree.root` as the
                cache, callers queue on it. The mount: `render_tree(el)` plus that
                container's own second half — `tree_dock(el)` for the dock
                (`:1086-1089`), opening the sheet for the sheet
              - `--ui-notree` still suppresses **both** containers, read the same way
                (`srvcfg.ui_notree`, `nu.js:1256`): a truthiness check, because the key
                is present in `js_htm` only when the volflag is set
                (`authsrv.py:3338-3341`)
  2. nu: wrap the tree widget in a bottom sheet
     touches: copyparty/web/nu.html, copyparty/web/nu.css, copyparty/web/nu.js
     do:      - **the widget is 0002's and is not rewritten here.** `tree_load()`
                (:793), `tree_first()` (:930), `tree_expand()` (:955), the node model
                (:846-911) and `render_tree(el)` (:1028) all exist, and `render_tree`
                already takes its container as an argument for exactly this card
                (see its comment, :967-972). This commit builds the **container**
              - tapping the current folder name in the nav bar (`#nu_here`,
                `nu.html:24`) opens it — the `▾` affordance the handoff draws
                (`README.md:94-95`); header is `Pastas` on the left and the full path
                truncated at 200px on the right
              - the sheet is **narrow-only**: at `>= 64em` the dock is the container and
                a sheet would be a second door to the same widget in the same window.
                Gate it on `CAP.wide` being false, from JS, with the `CAP.on("wide")`
                re-bind (`nu.js:231-275`) — closing the sheet if a resize crosses up
              - **it must not refetch what the dock already loaded**: both containers go
                through commit 1's loader, and `ST.tree.expanded` / `node.kids` are
                shared state, so a branch opened in the dock is already open in the
                sheet
              - the widget's chrome is already width-agnostic in CSS
                (`nu.css:640-646` and the `.nu_t*` rules below it) — this commit adds
                the sheet's own box, not a second copy of the node styles
              - the current node is already marked by the widget (`TREE_HERE`,
                `nu.js:974`), and navigation already goes through `keep()` (:197) so the
                `?nu` mode survives, including the `&nu` form on a dirkey href
done when:     suite green, no `.py` in the diff, and —
               at 390×844: the sheet opens from the folder title, tapping a **chevron**
               expands that branch with exactly one network request (devtools) while
               tapping the row's **name** navigates instead, the current folder is
               marked, arriving at a deep path paints its ancestors already open,
               navigating from the sheet lands in the new UI rather than the classic
               one, and on a `--dk` volume the navigated href still carries `?k=`;
               at 1440×900 the sheet does not exist and the dock is unchanged;
               **the mount check**: load at 390 wide, open the sheet, then resize past
               1024 — the dock renders and docks, with **zero** additional `?tree=`
               requests; and with `--ui-notree` neither container appears at either
               width and no `?tree=` is issued at all

### Card 5 — Selection mode
precondition:  Card 1 landed — the selection action bar is the same component in the
               same two placements, and Card 1 vacated the nav bar's right slot
read for why:  spec §D6 — why one file swipes without a dialog and N files confirm.
               `docs/specs/0002-...` §D2 for the desktop entry point;
               `docs/plans/0002-...:666-689` row 5. Handoff `README.md:96-97`,
               `:108-111`, `:117-119`, `:141-142`
commits:
  1. nu: add selection state and its two entry points
     touches: copyparty/web/nu.css, copyparty/web/nu.js
     do:      - `Selecionar` / `Concluir` in the nav bar's right slot, 14px/500, `--fg2`
                outside the mode and accent inside (`README.md:96-97`)
              - long-press 420ms enters the mode and marks the row, with
                `navigator.vibrate(12)` and a 6px movement cancel threshold
                (`README.md:243`) — installed **only under `CAP.coarse`**, from JS, with
                the `CAP.on("coarse")` re-bind (`nu.js:231-275`). A long-press handler
                installed for a mouse is the bug `CAP` exists to prevent
              - the checkbox **container** animates width 0 → 30px
                (`transition: width .18s ease`) with a 22px circle inside it — the width
                is what animates, not opacity (`README.md:117-119`); selected rows take
                the `--sel` background the palette already defines (nu.css:20)
              - **at `>= 64em` the checkbox is a permanent column, never a hover
                reveal** (0002 §D2): a new named line in `--nu-cols`, which is declared
                twice — `nu.css:991` (64em) and `:1117` (80em, the Type column) — and
                copied by `#nu_head` from the same variable (`:996`, `:1010`). Adding a
                track means both declarations and a matching cell in every row shape,
                including the back row and `.nu_empty`'s `grid-column: 1 / -1`
              - **shift-click and ctrl/cmd-click act on the checkbox, never on the
                row**: the row is an `<a href>` and a plain click must still navigate
                (`msel.seltgl`, `browser.js:8827-8868`, is the classic shape). Shift
                extends from the last touched checkbox, ctrl/cmd toggles one
              - 0002's keydown listener leaves `shift` alone on purpose
                (`nu.js:1216-1218`, "shift+arrow is range selection, and selection is
                0001's card 5") — this card may claim it, and if it does it extends that
                one listener rather than adding a second
  2. nu: add select-all and invert to the status line
     touches: copyparty/web/nu.js
     do:      - in selection mode the status line's left side becomes "N selecionados"
                and its right side becomes `Tudo` / `Inverter` (`render_stat`,
                nu.js:363-374; `README.md:108-111`); both operate on `filtered()`
                (:328), so they agree with the visible filter and search, never with
                `ST.items`
              - `render_stat` also writes `#nu_sort`'s label (:370-371) and shares its
                row with `#nu_tools` — keep both, at both widths
  3. nu: swap the action bar into its selection slots
     touches: copyparty/web/nu.html, copyparty/web/nu.css, copyparty/web/nu.js
     do:      - the bar swaps to `Baixar` / `Mover` / `Excluir`, all `flex:1`, with
                `Excluir` on `--danger` (nu.css:7) — **the same component from Card 1, a
                second slot set**, in both placements: the fixed bar narrow, `#nu_tools`
                wide (`README.md:141-142`; 0002 §D5)
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
done when:     suite green, no `.py` in the diff, and —
               at 390×844: long-press enters the mode and marks the row, a 7px drag
               during the press does **not**, `Tudo` and `Inverter` agree with the
               visible filter *and* the search box, deleting 3 files issues exactly one
               request and refreshes the listing, `Baixar` on a 2-file selection returns
               an archive containing exactly those two, and `--no-del` hides the delete
               button entirely;
               at 1440×900: the checkbox is a **column that is always there**, the
               columns beside it are still aligned with `#nu_head` (both read
               `--nu-cols`), the back row and the empty state still span correctly,
               ctrl-click toggles one row and shift-click extends a range **without
               navigating**, a plain click still navigates, and the selection buttons
               render in `#nu_tools` with no fixed bar;
               **capability, not width**: in a coarse profile at 1400px the long-press
               works; switching to a fine profile without reloading removes it

### Card 6 — Swipe actions and pull-to-refresh
precondition:  Card 5 landed — the swipe handler and the long-press handler share the
               same touch stream and must be written against each other
read for why:  handoff `README.md:237-251` for the exact thresholds;
               `docs/plans/0002-...:666-689` row 6 for the capability gate and the
               wide-band equivalent
commits:
  1. nu: add swipe actions on the row
     touches: copyparty/web/nu.css, copyparty/web/nu.js
     do:      - left swipe drags to −168px over a track (`#eceaf4`), revealing `Link`
                (84px) and `Excluir` (84px, `--danger`); release with `dx < −60` opens,
                otherwise it springs back to 0 (`README.md:244`)
              - **installed only under `CAP.coarse`, from JS**, with the
                `CAP.on("coarse")` re-bind — not hidden by CSS while the listener keeps
                running (`nu.js:231-275`, and the reasoning in its comment)
              - `transform .22s cubic-bezier(.2,.9,.3,1)`, and **`none` while the finger
                is down** (`README.md:250`) — with the transition live the drag lags the
                finger
              - a tap with a row already open **closes it and does not activate the
                item** (`README.md:245`) — the single most likely mis-tap in the whole
                design
              - `Link` copies the file url; `Excluir` deletes that one file with no
                dialog, because the swipe itself is already two deliberate acts
              - **the wide equivalent is a row added to 0002's `CTX` table**
                (`nu.js:604-618`), not a second menu: copy-link and delete were left out
                of that table on purpose, because a hover-only action with no visible
                door is unreachable by a finger at 1400px (0002 §D2). The swipe is that
                door narrow; the selection bar is that door wide; the `CTX` row is the
                accelerator over both
  2. nu: add pull-to-refresh
     touches: copyparty/web/nu.css, copyparty/web/nu.js
     do:      - only when `scrollTop <= 0`, and only under `CAP.coarse` with the same
                re-bind; displacement × 0.5, capped at 72px; label flips from "Puxe para
                atualizar" to "Solte para atualizar" past 48px; release past 48 holds at
                48 showing "Atualizando…" for **at least 900ms** while
                `fetch_ls(location.pathname, …)` reruns and `take()` re-renders
                (`README.md:246`) — the floor is what keeps a fast LAN response from
                reading as a glitch
done when:     suite green, no `.py` in the diff, and —
               at 390×844 the gesture matrix holds: a long-press does not open a swipe,
               a horizontal swipe does not scroll the list, a vertical drag from
               mid-list does not trigger the pull, a pull at the top does not open a
               swipe, and a tap on a row with another row open closes that row instead
               of opening a file;
               at 1440×900 in a fine profile: **no** touch handler is attached (a
               synthesized drag does nothing), and right-click offers copy-link and
               delete from the `CTX` table;
               switching that same window to a coarse profile without reloading gains
               the gestures and drops the context menu

### Card 7 — The image viewer
precondition:  Card 1 landed
read for why:  handoff `README.md:224-234` for the layout; spec "Out of scope" for what
               is explicitly not in this card; `docs/plans/0002-...:666-689` row 7
model:         opus
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
              - **at `>= 64em` it is not a full-bleed phone overlay** (0002 §D5): the
                image is bounded, the actions sit in a bar, and prev/next are reachable
                by the arrow keys
              - **declare who owns `keydown` while it is open.** 0002 put list traversal
                on a single document-level listener (`nu.js:1180-1250`) whose Escape
                branch is deliberately above the typing guard. The viewer extends **that
                listener** — an early branch when the viewer is open, the way `ctx_row`
                already short-circuits it (`:1211-1213`) — and does not add a second
                one: two listeners on `document` would each have to re-derive the typing
                guard, and the day they disagree the bug is invisible
              - **prev/next are in the design and are built** — the viewer's list is the
                folder's images in visible order and prev/next **wrap around**
                (`README.md:232-233`). What is missing, per the coverage matrix, is
                **zoom, swipe between images and slideshow**; do not invent those here
              - loads the original file, not `?th=`
              - closing returns to the same scroll position
done when:     suite green, no `.py` in the diff, and —
               at 390×844: tapping an image opens the viewer at the right index with the
               right counter, `›` from the last image wraps to the first, delete removes
               the file and returns to a refreshed listing, and closing restores the
               previous scroll position;
               at 1440×900: the image is bounded rather than full-bleed, `←`/`→` move
               between images, `Escape` closes the viewer and **not** the sort sheet
               underneath, and `↑`/`↓` do **not** walk the list behind the viewer

### Card 8 — Recursive search, and the docs catch up
precondition:  Card 1 landed — the placeholder is a translated string. Run last: the
               doc commit describes everything Cards 1-7 built
read for why:  spec §D5 — the gate, the rate limit, and why the promise is conditional;
               `docs/plans/0002-...:666-689` row 8 and the `plan-level` row
model:         opus
commits:
  1. nu: add recursive search on indexed volumes
     touches: copyparty/web/nu.js
     do:      - keep `filtered()` (nu.js:328) as the instant in-folder tier; it is the
                one that answers while you type
              - when `cfg.idx` is true (`"e2d" in vf`, `authsrv.py:3265`), submitting
                fires `POST <vpath>?srch` with `{"q": "...", "n": N}` (dispatch
                `httpcli.py:3184`; `n` is optional and defaults to `--srch-hits`,
                `:3305`; the classic UI's identical body shape is `browser.js:6702`),
                scoped to the current folder and below via the DSL's `path` keyword
                (`u2idx.py:272`)
              - **the hits render through the field-split row** (0002 Card 2) — `cell()`
                / `cell2()` (`nu.js:448-463`) and the same `.nu_row` markup — with the
                path in the name cell. A third row markup would break the column grid,
                which places by name and not by child order
              - fires **on submit, debounced, never per keystroke** — the server
                rate-limits consecutive searches with HTTP 429 when the previous query
                cost more than 0.7s and less than 0.7s of idle has passed
                (`handle_search`, `httpcli.py:3286-3291`) and that must surface as a
                readable message, not a silent empty result
              - when `cfg.idx` is false the placeholder keeps saying "in this folder" and
                **no request is ever issued** — an unindexed volume answers `?srch` with
                a 500 (`httpcli.py:3269-3272`)
  2. docs: bring nu-ui.md up to what nu actually does
     touches: docs/nu-ui.md
     do:      - `docs/nu-ui.md:59-63` still lists selection, swipe, pull-to-refresh,
                grid, the tree sheet, the overflow menu, settings and the viewer as
                "Not built, and therefore still reasons to reach for `classic UI`".
                After Card 7 that paragraph is false in eight places
              - `:145-160` — "what the wide band still owes" — loses **selection** and
                **the action bar's wide placement**, both built here; and the "no i18n
                wiring yet" paragraph (`:162-169`) is retired by Card 1
              - `:171-183` — "the ordering, so it is not re-derived" — describes a
                re-plan that has now happened and cards that have now run; rewrite it as
                what the two specs each own, in the past tense
              - `:206-214` — "what is NOT built yet" — keeps upload and the parity-only
                surfaces, and drops recursive search, the navpane tree, thumbnails and
                the file manager's delete
              - the file is the only prose a reader meets before the code; leaving it
                stale is how the next spec re-derives a solved problem
done when:     suite green, no `.py` in the diff, and —
               on an `-e2dsa` volume at both widths, submitting a query finds a file two
               folders down and tapping a hit navigates to it, and at 1440×900 the hits
               line up under `#nu_head`'s columns;
               two submits in immediate succession surface the 429 as a message rather
               than as an empty list;
               on a volume with no index the placeholder does not promise recursion and
               devtools records **zero** `?srch` requests;
               `docs/nu-ui.md` names nothing as missing that Cards 1-7 built

## Verification (mirrors the spec's §Verification)

Run after Card 8, as the whole-plan check.

- **No server drift.** `git diff decdcbca..HEAD -- 'copyparty/*.py'` is empty. The one
  template variable the spec allowed was already landed by 0002 (`srvcfg = {{ cgv1 }}`,
  `nu.html:88-96`), so the correct diff is zero Python.
- **The dotfile trap.** Card 2's gate, re-run after everything else landed — including
  the tree half: a branch expanded before the toggle agrees with one expanded after.
- **The unindexed volume.** Search promises nothing, folder rows degrade to date only
  (`nfiles()`, nu.js:82), thumbnails fall back to the served icon, and the wide band's
  Size cell for a folder stays **empty** rather than reading `4.0 KB`.
- **The default install is clean.** With no `--lang`, the network log shows no 404 —
  the `tl/{{ lang }}.js` tag is guarded, because there is no `web/tl/eng.js`.
- **One markup, still.** `grep -c 'nu_list").innerHTML' copyparty/web/nu.js` counts only
  `render_list()`, `render_grid()` and `fetch_ls()`'s error message. Grid is the single
  sanctioned second renderer (`docs/nu-ui.md:91-96`); a fourth writer is a bug.
- **The resize gate.** 1200px → 380px → 1200px without a reload keeps the sort, the
  filter, the search text, the selection and the scroll position, and issues **no**
  `?ls` and no second `?tree=`.
- **Capability, not width.** In a coarse profile at 1400px: long-press, swipe and pull
  work and the context menu does not exist. In a fine profile at 390px: the reverse.
  Flipping the profile without reloading flips the behavior — that is what proves the
  `CAP.on()` re-bind was used rather than a boot-time latch.
- **Nothing is hover-only.** Every action reachable from the `CTX` menu also has a
  visible control at that width.
- **The admin's switches still reach `nu`.** `--ui-notree` leaves no dock **and no
  sheet**, and zero `?tree=` at either width; `--ui-noctxb` falls through to the
  browser's menu.
- **The classic UI is untouched.** `?b` reaches the basic browser, `?nu0` escapes, the
  `classic` row in the `⋯` still unpins the `ui=nu` cookie, and no file under
  `copyparty/web/` other than `nu.*` appears in the diff.
- **No new files under `web/`.** Every card edits `nu.js` / `nu.css` / `nu.html`. If a
  card ever adds a file there, it must also be added to the manifest `RES` is built from
  (`copyparty/__init__.py:101-103` is where the `nu.*` entries live, `RES = set(...)` at
  `:143`) **and** `scripts/sfx.ls` (`:105-107`), or it will 404 in dev and vanish from
  the sfx build.
- **Suite:** `python3 -m unittest discover -s tests` green — 31 tests, as at `decdcbca`.
  A regression guard, not evidence the work is right.

## Follow-ups this plan deliberately does not take

- **Upload**, and drag & drop upload with it — spec §D2, its own spec.
- **The move flow** — the button lands in Card 5; the destination picker, the N-request
  progress and `?fs_abrt` cancellation are a flow to design.
- **`sorted()`'s `sz` comparator** still orders folders by `f.sz` (`nu.js:236-237`),
  which is ~4096 wherever the recursive size was never filled. 0002 parked it with the
  mtp/column spec that revisits the sort keys; this plan does not move it.
- **The full keyboard map** — Cards 5 and 7 both extend the one document listener, but
  what exists afterwards is still traversal plus two overlays, not a map.
- **The tree dock's width, collapse and persistence** (`treesz`, `parpane`, `dyntree`)
  and **mtp tag columns** — 0002 §Out of scope, each waiting on a spec of its own.
