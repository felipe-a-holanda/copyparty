---
number: 0001
type: spec
slug: nu-the-rest-of-the-mobile-design
title: "The rest of the mobile design: nu beyond the base layer"
status: pousado
created: 2026-08-23
headline: A phone can browse, sort, select, move, delete, share and preview files in the new UI without ever falling back to the old one, and the settings it offers finally stick.
tags: [spec, status/pousado]
par: "[[plans/0001-nu-the-rest-of-the-mobile-design|plan]]"
---

# 0001 — The rest of the mobile design: nu beyond the base layer

> `nu` is the second filebrowser UI, living beside the classic one (`docs/nu-ui.md`).
> Its base layer landed in `0affcaee`: list, row, navigation, the sticky header
> (search, filter chips, status line) and the sort sheet. The mobile design in
> `design-handoff/` specifies seven more surfaces that were deliberately left out of
> that first slice, and until they exist the `classic UI` link is what a phone falls
> back to for anything past looking at a folder. This spec builds them: the bottom
> bar, the `⋯` menu, settings, grid view, the folder-tree sheet, selection mode,
> swipe actions, pull-to-refresh, the image viewer, and recursive search. It does
> **not** build upload, which gets its own spec.

**Status:** planejado — plan written, and **re-planned against `decdcbca`** once
spec 0002 landed. What exists in the tree today is the base layer plus 0002's width
work (`web/nu.js`, `web/nu.css`, `web/nu.html`): three bands over one markup, the
field-split row and its column grid, the column header, the `?tree=` reader with its
wide dock, and desktop input. There is still no bottom bar, no `⋯`, no settings
screen, no grid, no tree sheet, no selection, no swipe and no viewer, and the search
box filters the current folder client-side (`filtered()`, `web/nu.js:328`). Every
preference the design offers is hardcoded: `dir1st = true` (`web/nu.js:292`), one size
format (`humansize()`, `:112`), no dotfile toggle. Two things this spec listed as its
own arrived early with 0002 and are no longer owed here: the `?tree=` **widget** (0002
§D3 — only its sheet wrapper remains) and the `cgv1` template binding. The plan
(`docs/plans/0001-nu-the-rest-of-the-mobile-design.md`) mirrors this number.

---

## The thesis

The base layer proved the cheap half of the bet: `nu` renders the same JSON the
classic UI consumes, so a second UI costs one line of server plumbing (`"cfg":
vn.js_ls`, `httpcli.py:7342`) and no server logic at all. This spec is the claim
that the **expensive-looking** half is also mostly client work — because every
action the design draws already has an endpoint, and the base layer already carries
the state machine those actions mutate.

The investigation confirms it. Delete is `POST ?delete` (`httpcli.py:2487`), move is
`POST ?move` (`:2481`), new folder is `handle_mkdir` (`:3736`), the folder tree is
`?tree=` (`tx_tree`, `:6062`), share is `POST ?share` (`:3187`), recursive search is
`POST ?srch` (`handle_search`, `:3267`) whose query DSL already understands a `path`
keyword (`u2idx.py:272`), and thumbnails are `?th=w` with no server capability gate
to negotiate — the classic UI treats thumbs as a user toggle plus a browser-format
probe (`browser.js:5873-5878`), not as a server feature flag. **Nothing in this spec
adds a route, a parameter or a response field.**

The one genuinely new thing is a *preference layer*, and it is new because of a trap
described in D3.

## The horizon (D1) — the classic UI is scaffolding, not a permanent surface

**Decided by the author: `nu` is aiming at full parity, and the classic UI is meant
to die once it gets there.** This is the load-bearing decision of the whole effort,
and it is recorded here because it changes what "out of scope" means for every later
spec.

The design handoff's coverage matrix scores 38 classic-UI functions and marks 9 of
them `não migrado` — control panel (`splash.html`), the admin panel, active
uploads/downloads, keyboard shortcuts, the ten themes, the mtp tag columns, hide-columns,
and the audio player. **Every one of those was scored on the assumption that the
classic UI stays.** With parity as the target that assumption is void: they are
*deferred*, not *rejected*, and the matrix's own note about keyboard shortcuts says
as much ("some junto se a UI virar uma só").

The consequence this spec must honor, and the reason the decision belongs here rather
than in a later one: **the `⋯` menu is a router, not a list of four items.** The design
draws it holding the handful of things that did not fit the bottom bar. It is also the
only door `nu` will ever have for the surfaces the design never drew. Build it as a
sectioned, extensible sheet whose entries are declared in one table, so that adding
"control panel" later is a row, not a redesign.

Nothing else in this spec changes because of D1. It is written down so the next spec
does not have to rediscover it.

## The edge (D2) — this spec is the design, minus upload

**In:** every screen and gesture in `design-handoff/extracted/design_handoff_nu_mobile/README.md`
§1–§7 and its "Interações e gestos" table, plus the recursive tier of search that the
design's own placeholder promises ("Buscar nesta pasta e abaixo").

**Out, to its own spec:** upload. The design draws the `Enviar arquivos` button but
explicitly does not draw the up2k panel (queue, hashing, progress, resume) — the
coverage matrix scores it `half` for exactly that reason. It is the only piece here
with a real new boundary: `up2k.js` is not a library, it drives ~47 specific element
ids, and the alternative is reimplementing chunked hashing, resume and dedup against
`docs/up2k.txt`. That choice is deliberately **not** made here (see Open questions);
mixing it in would keep this spec from ever closing.

Until that spec lands, the bottom bar's `Enviar arquivos` renders **disabled with a
one-tap route to the classic UI**, not hidden. Hiding it would make the design look
finished when it is not; a dead button that explains itself is the honest state.

## The decisions

### D3 — Preferences split by who enforces them, and dotfiles are the trap

The design says preferences persist in `localStorage`, "como o `nu_thm` que o `nu.js`
já grava". That is right for all of them but one, and the exception is invisible
until it silently fails.

**Dotfiles are filtered server-side** (`httpcli.py:7433-7437`). A client-side "show
hidden files" toggle can only hide what the server already sent; it can never reveal
what the server withheld. So the toggle has to reach the server — and here is the
trap:

```python
if not self.can_dot or (
    "dots" not in self.uparam and (is_ls or "dots" not in self.cookies)
):
```

**The `dots` cookie is ignored on the `?ls` path.** `is_ls` short-circuits it. The
first paint honors the cookie (the embedded `ls0` is not an `?ls` request), so a
cookie-only implementation would appear to work on load and then silently drop
dotfiles on the very next tap, when `fetch_ls()` (`web/nu.js:370`) refetches. That is
the worst possible failure shape: correct once, wrong forever after, with no error.

So the rule is: **`dots` rides the query string on every `?ls` fetch**, and the cookie
exists only so the first paint agrees with it. The toggle is also gated on
`can_dot` — a user without `udot` permission gets nothing regardless, so the settings
row is hidden rather than shown-and-inert.

Everything else — `dir1st`, `nsort`, size format, thumbnails on/off, grid/list, accent,
theme, density — is enforced entirely in `nu.js` and lives in `localStorage`, one key
per preference, seeded from the volume's own defaults in `cfg` (`dnsort`, `dsort`,
`dgrid`, `dcrop`, `dth3x`, `authsrv.py:3264-3282`) so a volume configured with `-e2d
--nsort` opens sorted the way its operator intended before the user has touched
anything.

`nu` does **not** invent new server cookies: `setck` rejects any `k=v` longer than 9
characters (`httpcli.py:5915`), so the cookie channel is reserved for the short names
that already exist (`ui`, `dots`).

### D4 — The tree sheet reads `?tree=`, it does not crawl `?ls`

`tx_tree` (`httpcli.py:6062`) returns one level of subdirectories per call and is what
the classic navpane already uses. The sheet expands lazily, one branch per tap, exactly
like the endpoint's shape — no recursive prefetch of the whole volume, which on a deep
volume over a phone connection is the difference between a sheet and a stall.

The design's `parpane` (fixed panel on wide screens), `dyntree` (auto-expand) and the
🎯 scroll target are **not** built; the coverage matrix already scores them as the
missing part of this row.

### D5 — Search stays two-tier, and only promises what the volume can deliver

The instant tier is what exists: `filtered()` over the loaded folder, no roundtrip.
It stays, because it is the one that answers while you type.

The recursive tier is `POST /?srch` with `{"q": "...", "n": N}`, scoped by the DSL's
`path` keyword to the current folder and below. It is **gated on `cfg.idx`** (`"e2d"
in vf`, `authsrv.py:3265`): search on an unindexed volume returns a 500 from
`handle_search`, so on such a volume the placeholder stays "Search in this folder" and
no request is ever made. Only an indexed volume gets the design's "and below". The UI
must not promise a capability the volume does not have — that is how the base layer's
placeholder came to say "in this folder" in the first place.

The server also rate-limits consecutive searches (`:3290-3294`, HTTP 429), so the
recursive tier is debounced and fires on submit, never per keystroke.

### D6 — Two gestures to delete one file; a confirmation to delete many

The design's swipe already costs two deliberate acts: drag past −60px to reveal, then
tap `Excluir`. That is enough friction for a single row, and adding a dialog on top
would make the gesture the design drew feel broken.

The selection bar's `Excluir` is different — it destroys N files at once, and the only
thing standing between a mis-tap and that is the same 48px button. It confirms, naming
the count.

### D7 — Grid and thumbnails need no server negotiation

`?th=` takes the format in the parameter (`x` jxl / `w` webp / `j` jpeg) and the classic
UI picks it from browser support probes, not from anything the server announced
(`browser.js:5873-5878`); thumbnails-on/off is a plain user toggle (`bcfg_bind(r,
'thumbs', ...)`, `:6040`). `nu` does the same. A volume with `dthumb` set simply
returns no thumb, and the tile falls back to the type chip it already draws — which
is also the design's own placeholder behavior.

## What is genuinely new, versus what is merely reused

**Genuinely new:**

- **The preference layer** — the read/write/seed path for ~8 preferences, the
  `localStorage` schema, and the `dots` query-param plumbing of D3. This is the only
  part with a subtle failure mode, and it is why it lands early.
- **The `⋯` router** (D1) — a sectioned sheet with a declarative entry table, sized for
  surfaces that do not exist yet.
- **Gesture handling** — long-press with a 6px cancel threshold, horizontal swipe with
  a −168px track, and pull-to-refresh gated on `scrollTop <= 0`. Three touch state
  machines that must not fight each other or the list's own scroll.
- **The image viewer** — a full-screen surface `nu` has no equivalent of today.

**Reused, not rebuilt:**

- Every server endpoint listed in the thesis. Zero new routes.
- `fetch_ls()` / `take()` / `draw()` (`web/nu.js:365-388`) — the load-and-render cycle
  each new surface hangs off; grid is a second renderer over the same `filtered()`
  output, not a second data path.
- `sorted()`, `filtered()`, `keep()`, `unpin()` (`:156-231`) — sorting, filtering and
  the `?nu` mode plumbing survive as-is; settings only feed them values that were
  previously constants.
- The `nm()` / `dt_short()` / `ts_of()` readers (`:33-72`) that already absorb the
  `ls0`-versus-`?ls` shape divergence. Every new surface reads through them.
- `web/tl/*.js` + `web/util.js` — the existing i18n machinery. `nu` adopts it; it does
  not get a second one.

## What the server must provide

Nothing. No new endpoint, no new query parameter, no new response field, no config
flag. If any commit in the plan finds itself editing `httpcli.py` beyond a template
variable, that is the signal to stop and reopen this spec.

## Out of scope (named, deferred)

- **Upload** — D2. Its own spec, and the one piece with a real new boundary.
- **Markdown reader/editor** (`md.html`, `mde.html`) — separate full screens the
  design explicitly leaves for another round.
- **Unpost, new `.md`, server-log message** — three low-traffic actions the coverage
  matrix parks in the `⋯`. D1 makes the `⋯` able to hold them; this spec does not fill
  those rows, because each needs its own small flow and none of them is why someone
  reaches for a phone.
- **Multi-level sort** (`hsortn`) — copyparty chains N sort criteria; the sheet offers
  one. Deferred until a real folder makes one insufficient.
- **Rename, and the move *flow*** — `Mover` appears in the selection bar with no
  destination picker drawn, and rename is absent from the design entirely. The button
  is built; where it lands the files is undesigned, so the flow is deferred rather than
  invented here. See Open questions.
- **Share creation with password and expiry** — the swipe reveals `Link` (a plain copy
  of the URL); `POST ?share` with its options is a form nobody drew.
- **The parity-only surfaces** — control panel, admin panel, active transfers, keyboard
  shortcuts, the ten themes, mtp tag columns, the audio player. Deferred by D1, not
  rejected; the `⋯` is where they will dock.

## Open questions

- **Upload: reuse or reimplement?** Deliberately unpinned (D2, author's call to defer).
  Reusing `up2k.js` inside a hidden container that recreates its ~47 element ids buys
  hashing, resume, dedup and queueing intact, at the cost of a permanent ugly seam
  between two DOM worlds. Reimplementing against `docs/up2k.txt` gives a clean client
  designed for this UI, at the cost of rewriting the code paths where a bug loses a
  user's file. The upload spec decides.
- **Where the parity-only surfaces actually live.** D1 says the `⋯` is the door; it does
  not say whether the control panel becomes a sheet, a full screen, or a link that
  leaves `nu`. Pin it when the first one is built, not before.
- **The audio player versus D1.** The handoff records it as out by the author's own
  decision, scoped to the mobile redesign. Parity puts it back on the road. Which
  ruling holds is a question for whoever writes that spec.
- **mtp tag columns under parity.** Artist/album/duration/bpm are table columns in the
  classic UI and the design's row has no space for them. An info sheet per file is the
  obvious home, but nothing draws it.
- **Move's destination picker.** The tree sheet (D4) is the natural reuse — the same
  widget, in "pick a folder" mode. Worth confirming that reading is right before the
  plan turns it into a card.
- **Density toggle.** The design mentions a compact row (`9px 16px` instead of `14px
  16px`) without saying what switches it. Presumably a settings row; `/planc` pins it.

## Commit sketch (NOT session cards — `/planc` expands these)

Dependency-ordered. Items 1–3 are the scaffolding the rest hangs off; 4–9 are largely
independent of each other and could be reordered or parallelized.

1. **The bottom bar and the `⋯` router.** The bar's three slots, `Nova pasta` wired to
   the existing `?mkdir`, `Enviar arquivos` disabled with its route to the classic UI
   (D2), and the `⋯` sheet as a declarative entry table (D1). Nothing behind the menu
   yet — this is the frame.
2. **i18n: `nu`'s strings through `web/tl/*.js`.** Early on purpose. Every string the
   base layer hardcoded moves into the existing machinery now, so the seven screens
   after this are *born* translated instead of being retrofitted — which, done last, is
   the pass that never happens.
3. **The preference layer and the settings screen.** `localStorage` schema seeded from
   `cfg`, the `dots` query-param plumbing and its `can_dot` gate (D3), and the screen
   itself. Unlocks `dir1st`, `nsort`, size format, theme and accent, all of which are
   constants in the code today.
4. **Grid view and thumbnails.** A second renderer over `filtered()`, `?th=` with the
   browser-format probe, falling back to the type chip (D7). Reachable from the status
   line and the `⋯`.
5. **The folder-tree sheet.** Lazy `?tree=` expansion, one branch per tap (D4).
6. **Selection mode.** Long-press with the 6px cancel threshold, the checkbox column's
   width transition, select-all/invert in the status line, and the selection action bar
   — `Baixar`, `Mover` (button only; the flow is deferred), `Excluir` with its
   count-naming confirmation (D6).
7. **Swipe actions and pull-to-refresh.** The −168px track revealing `Link` and
   `Excluir`, plus the pull gesture. Grouped because they are the two touch state
   machines that must coexist with the list's scroll and with item 6's long-press.
8. **The image viewer.** Full screen with name, dimensions, counter and actions.
   Explicitly without zoom, inter-image swipe and slideshow, which the coverage matrix
   already scores as the missing part.
9. **Recursive search.** `POST /?srch` scoped by the `path` keyword, gated on `cfg.idx`,
   debounced and fired on submit (D5). The placeholder finally says what the design
   drew, on the volumes where it is true.

---

## Verification (how to prove it, when it lands)

- **The dotfile trap, specifically.** On a volume where the user has `udot`: toggle
  hidden files on, confirm dotfiles appear, then **navigate into a subfolder and back**
  and confirm they are still there. This is the assertion that catches D3's failure
  mode; a cookie-only implementation passes every other dotfile check and fails this
  one.
- **No server drift.** `git diff` over the whole plan touches no `.py` file except a
  template variable in `httpcli.py`, if even that.
- **The unindexed volume.** On a volume without `-e2d`: the search placeholder does not
  promise recursion, no `?srch` request is ever issued, and folder rows degrade to date
  only (the base layer's existing `nfiles()` behavior, `web/nu.js:58`).
- **Preferences survive a reload and agree with the first paint** — set each one, reload,
  and confirm the rendered listing matches before any JS-driven refetch.
- **The gestures do not fight.** With items 6 and 7 both landed: a long-press does not
  trigger a swipe, a horizontal swipe does not scroll the list, a vertical drag at the
  top does not open a swipe, and a tap with a row already swiped closes it instead of
  opening the file.
- **The classic UI is untouched.** `?b` still reaches the basic browser, `?nu0` still
  escapes, and no file under `web/` other than `nu.*` is modified.
- **Suite:** `python3 -m unittest discover -s tests` green (31 tests at `0affcaee`).
