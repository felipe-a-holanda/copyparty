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

> Eight sessions that take `nu` from "a list you can look at" to "a phone you can
> actually work from". No new route, no new parameter, no new response field.

## Context

`nu` is the second filebrowser UI (`docs/nu-ui.md`); its base layer landed in
`0affcaee` — list, row, navigation, sticky header, sort sheet. Spec 0001 scopes the
seven surfaces the mobile design specifies and that slice left out, plus the
recursive tier of search. Upload is deferred to its own spec (0001 §D2).

Read the spec for the *why*. This file is the *how it lands*.

## Decisions pinned here (open questions from spec §Open questions)

- **Move's destination picker.** Confirmed: the tree sheet (Card 4) is the widget,
  in a "pick a folder" mode. But the *flow* stays deferred — Card 5 lands the
  `Mover` button only, for two reasons. `?move=` takes **one source per request**
  (`POST <src>?move=<dst>`, dst being the full destination path including filename),
  so N selected items are N requests with N partial-failure states and no batch
  endpoint to lean on. And a folder source is a **long, abortable** operation:
  `up2k.handle_mv` (`copyparty/up2k.py:4590`) walks the whole tree server-side when
  the source is a directory (`:4623-4659`), checking an abort key after every file,
  which is what `?fs_abrt` (`httpcli.py:6871`) exists for. So the flow needs progress
  and cancellation, not just a destination picker. That is a flow to design, not a
  button to wire.
- **Density toggle.** A row in the settings screen (Card 2), alongside the other
  display preferences. The design gives the compact metrics (`9px 16px`) without
  saying what switches it; nothing else in the design is a plausible home.

## What the investigation changed about the shape

Two findings move work between cards. Both are load-bearing.

### `cgv1` is already in the template — no server change at all

`j2a` already passes `"cgv1": vn.js_htm` (`copyparty/httpcli.py:7334`), and `js_htm`
(`copyparty/authsrv.py:3286-3320`) carries exactly the capability flags the later
cards need: `have_del`, `have_mv`, `have_shr`, `have_zip`, `ext_th`, `see_dots`. The
`nu.html` bootstrap simply does not bind it yet.

So the spec's escape clause ("if a commit edits `httpcli.py` beyond a template
variable, stop") tightens to **zero**: binding `cgv1` in the template's existing
script block is a `nu.html` edit, not an `httpcli.py` one. Any `.py` diff in this plan
is a signal to stop.

Permissions are already bound too — `perms` (`nu.html`, from `cgv.perms`,
`httpcli.py:7269-7285`) carries `read`/`write`/`move`/`delete`/`dot`/`admin`, so every
destructive control and the dotfile row gate client-side with no roundtrip.

### The classic UI's i18n breaks the moment `nu` adds a key

`browser.js:716` resolves the language **whole-object**:

```javascript
var L = Ls[lang] || Ls.eng, LANGS = [];
```

The 22 files under `copyparty/web/tl/` each set `Ls.<lang> = {...}` keyed to
`browser.js`'s namespace (`browser.js:11`, `Ls.eng = {`). A `por` user gets `Ls.por`
— which contains none of `nu`'s keys. There is **no per-key fallback**, so every new
key renders `undefined`, in every language except English, silently.

This is why i18n is in **Card 1** rather than last: `nu` needs a `t(k)` helper doing
per-key fallback before any card adds a string, or seven cards' worth of strings get
retrofitted after the fact — the pass that never happens.

## The endpoints each card talks to (all pre-existing)

| surface | request |
|---|---|
| new folder | `POST <vpath>` multipart, `act=mkdir` + `name` (dispatch `httpcli.py:3100`, `handle_mkdir:3736`) |
| folder tree | `GET <vpath>?tree=<top>` → `{"a": [names], "k<name>": {nested}}` (`gen_tree:6088`) |
| delete | `POST <vpath>?delete` + JSON list of vpaths (`handle_rm:6777`) — one request for N files |
| move | `POST <src>?move=<dst>` (`handle_mv:6808`) — one request per **item**; a folder source is walked server-side (`up2k.py:4590`), so a whole tree is still one request |
| abort a move | `POST <vpath>?fs_abrt=<akey>` (`handle_fs_abrt:6871`) — folder moves check the key after every file |
| thumbnails | `GET <file>?th=x\|w\|j` (+`f` no-crop, +`3` hi-res), format chosen by browser probe as in `browser.js:5873-5878` |
| recursive search | `POST <vpath>?srch` + `{"q": "...", "n": N}` (`handle_search:3267`), `path` keyword in the DSL (`u2idx.py:272`) |
| dotfiles | `dots` in the **query string** of every `?ls` (see below) |
| cookie writes | `GET ?setck=<k>=<v>` (`setck:5913`) — `k=v` capped at 9 chars |

## Sessions  ·  one card = one fresh session; a card may land several commits; git carries state between cards

Single lane: every card edits `copyparty/web/nu.js`, `nu.css` and `nu.html`, so the
touches collide by construction and the cards run in sequence. No `lane:` stamps.

There is no JS test harness in this repo, so each card's gate is the Python suite
(proves nothing regressed) **plus a named, falsifiable manual check** at 390×844.
Serve a test volume with `-e2dsa` so indexed-only behavior is exercised.

### Card 1 — The shell: i18n, bottom bar, and the ⋯ router
precondition:  none — first card
read for why:  `docs/specs/0001-nu-the-rest-of-the-mobile-design.md` §D1 (why the ⋯ is
               a router) and §D2 (why upload is a disabled button, not a hidden one)
commits:
  1. nu: route strings through the existing i18n, with a per-key fallback
     touches: copyparty/web/nu.html, copyparty/web/nu.js  (only these)
     do:      - load `tl/{{ lang }}.js` in nu.html the way browser.html:155 does
              - define `Ls.eng` in nu.js with nu's own keys, and add
                `function t(k) { return (L && L[k]) || Ls.eng[k] || k }` — the
                per-key fallback the classic UI lacks (`browser.js:716` is
                whole-object, so a `por` user would get `undefined` for every key
                the 22 tl files do not carry)
              - move the base layer's hardcoded strings through `t()`: the filter
                chip labels (`FILTERS`, nu.js:121), the sort labels (`SORTS`, :131),
                the status line (`render_stat`, :244), the Back row (`render_list`,
                :264) and the `classic UI` link
              - reuse an existing tl key wherever the classic UI already ships the
                same string; only genuinely new strings get new `Ls.eng` keys
  2. nu: bind the server capability flags in the template
     touches: copyparty/web/nu.html
     do:      - add `srvcfg = {{ cgv1|tojson }}` to the bootstrap script block
                alongside `cfg` — `j2a` already passes it (`httpcli.py:7334`), so
                this needs no server change and unlocks `have_del`, `have_mv`,
                `have_shr`, `have_zip`, `ext_th`, `see_dots` for the later cards
  3. nu: add the bottom bar with new folder and the upload escape hatch
     touches: copyparty/web/nu.html, copyparty/web/nu.css, copyparty/web/nu.js
     do:      - the three-slot bar per handoff §1 "Barra inferior": `Enviar
                arquivos` (flex 1.4, accent), `Nova pasta` (flex 1), `⋯` (48px)
              - `Nova pasta` posts multipart `act=mkdir` + `name` to the current
                vpath, then re-runs `fetch_ls()` (nu.js:370); shown only when
                `perms` contains `write`
              - `Enviar arquivos` renders **disabled** and routes to the classic UI
                on tap (spec §D2) — a dead button that explains itself, not a
                hidden one that makes the UI look finished
  4. nu: add the overflow menu as an extensible router
     touches: copyparty/web/nu.html, copyparty/web/nu.css, copyparty/web/nu.js
     do:      - reuse the sheet machinery in `sheet()` (nu.js:324), including the
                synchronous-reflow line and the comment explaining why it is not
                `requestAnimationFrame`
              - render from a declarative `MENU` table (key, label key, enabled
                predicate, handler) grouped into sections, so a later spec adds a
                row rather than redesigning the sheet (spec §D1)
              - entries gate on `srvcfg` and `perms`; the sections are born
                near-empty and fill up across Cards 2-8
done when:     `python3 -m unittest discover -s tests` green, **no `.py` file in the
               diff**, and at 390×844: the bar renders above the list without
               covering the last row, `Nova pasta` creates a folder and the listing
               refreshes, `⋯` opens and closes on the veil, and loading with
               `?cplng=por` shows Portuguese where a key exists and **English, never
               `undefined`**, where it does not

### Card 2 — Preferences and the settings screen
precondition:  Card 1 landed — the ⋯ is where Settings is reached from, and `t()`
               must exist before this card adds ~20 strings
read for why:  spec §D3 in full. This is the card with the silent failure mode; the
               section explains it and the gate below is the check that catches it
commits:
  1. nu: add the preference layer, seeded from the volume defaults
     touches: copyparty/web/nu.js
     do:      - `pref(k)` / `setpref(k, v)` over localStorage, one `nu_`-prefixed
                key per preference, tolerating a throwing accessor
              - seed from `cfg` (`vn.js_ls`, authsrv.py:3264): `dnsort`, `dsort`,
                `dgrid`, `dcrop`, `dth3x` — a volume configured `--nsort` opens
                sorted the way its operator meant, before the user touches anything
              - replace the constants the base layer hardcoded: `dir1st`
                (nu.js:173), the `localeCompare` numeric flag (:175-179) and the
                fixed unit table in `humansize()` (:75)
  2. nu: send dots on every listing fetch, not just the first paint
     touches: copyparty/web/nu.js
     do:      - append `dots` to the url built in `fetch_ls()` (nu.js:370) when the
                preference is on. **The cookie alone is not enough**: the server
                short-circuits it on the `?ls` path (`httpcli.py:7433-7437`,
                `"dots" not in self.uparam and (is_ls or "dots" not in self.cookies)`),
                so a cookie-only toggle works on first paint and silently drops
                dotfiles on every navigation after
              - keep the cookie in sync via `?setck=dots=y` so the *first paint*
                (embedded `ls0`, not an `?ls` request) agrees with the toggle
              - gate the whole feature on `perms` containing `dot`; hide the row
                rather than showing it inert
  3. nu: add the settings screen
     touches: copyparty/web/nu.html, copyparty/web/nu.css, copyparty/web/nu.js
     do:      - full screen off the ⋯, sections per handoff §6: hidden files,
                folders first, natural sort, size format, thumbnails, density,
                theme and accent
              - theme + accent replace the boot-time OS-follow at nu.js:392;
                keep honouring the stored key that block already reads
done when:     suite green, no `.py` in the diff, and **the trap check**: with a user
               holding `udot`, turn hidden files on, confirm dotfiles appear, then
               **navigate into a subfolder and back** and confirm they are still
               there (a cookie-only implementation passes everything else and fails
               exactly here) — plus every preference survives a reload and the first
               paint already matches it, before any refetch

### Card 3 — Grid view and thumbnails
precondition:  Card 2 landed — grid on/off and thumbnails on/off are preferences,
               and their defaults come from `cfg.dgrid` / `cfg.dcrop` / `cfg.dth3x`
read for why:  spec §D7 — short; it explains why no server capability is negotiated
commits:
  1. nu: add grid view as a second renderer
     touches: copyparty/web/nu.html, copyparty/web/nu.css, copyparty/web/nu.js
     do:      - a `render_grid(shown)` beside `render_list` (nu.js:261), fed by the
                same `filtered()` output — a second renderer, not a second data path
              - 3 columns per handoff §2, type chip and caption on each tile
              - the Grade/Lista control in the status line (`render_stat`, :244) and
                a mirror entry in the ⋯
  2. nu: add thumbnails to the grid
     touches: copyparty/web/nu.js, copyparty/web/nu.css
     do:      - `?th=` with the format chosen by browser probe (jxl `x`, webp `w`,
                else `j`), `f` when not cropping, `3` on hi-dpi — same negotiation
                as `browser.js:5873-5878`
              - honour `srvcfg.ext_th` (per-extension icon overrides) before
                falling back to a thumb request
              - on error or on a `dthumb` volume the tile falls back to the type
                chip it already draws; never a broken-image box
done when:     suite green, no `.py` in the diff, and at 390x844: the grid renders 3
               columns, thumbnails appear on an image folder, the view survives a
               reload, and on a volume started with `--no-thumb` every tile shows
               its type chip with no broken images and no console errors

### Card 4 — The folder-tree sheet
precondition:  Card 1 landed — reuses the ⋯ card's sheet machinery and `t()`
read for why:  spec §D4 — why lazy, and what is deliberately not built
commits:
  1. nu: add the folder-tree sheet
     touches: copyparty/web/nu.html, copyparty/web/nu.css, copyparty/web/nu.js
     do:      - tapping the current folder name in the nav bar opens it (the `▾`
                affordance already drawn in the handoff)
              - `GET <vpath>?tree=<top>` returns `{"a": [child dir names],
                "k<name>": {pre-expanded branch}}` (`gen_tree`, httpcli.py:6088-6169);
                a name arriving with a trailing newline marks a dir the server could
                not stat, and renders dimmed rather than being dropped
              - **one fetch per expanded branch**, never a recursive prefetch — on a
                deep volume over a phone connection that is the difference between a
                sheet and a stall
              - the current folder is marked; tapping a row navigates through
                `keep()` (nu.js:156) so the `?nu` mode survives
done when:     suite green, no `.py` in the diff, and: the sheet opens from the
               title, a branch expands on tap with exactly one network request per
               expansion (devtools), the current folder is marked, and navigating
               from the sheet lands in the new UI rather than the classic one

### Card 5 — Selection mode
precondition:  Card 1 landed — the selection action bar replaces the bottom bar's
               navigation slots, so that bar must exist
read for why:  spec §D6 — why one file swipes without a dialog and N files confirm
commits:
  1. nu: add selection mode with long-press
     touches: copyparty/web/nu.css, copyparty/web/nu.js
     do:      - `Selecionar` / `Concluir` in the nav bar's right slot
              - long-press 420ms enters the mode and marks the row, with
                `navigator.vibrate(12)` and a 6px movement cancel threshold
              - the checkbox column animates 0 -> 30px (`transition: width .18s`);
                selected rows take the `--sel` background the palette already defines
  2. nu: add select-all and invert to the status line
     touches: copyparty/web/nu.js
     do:      - in selection mode the status line's left side becomes "N
                selecionados" and its right side becomes Tudo / Inverter
                (`render_stat`, nu.js:244)
  3. nu: add the selection action bar
     touches: copyparty/web/nu.html, copyparty/web/nu.css, copyparty/web/nu.js
     do:      - the bottom bar swaps to Baixar / Mover / Excluir in selection mode
              - Excluir posts **one** request: `POST <vpath>?delete` with the JSON
                list of selected vpaths (`handle_rm`, httpcli.py:6777), behind a
                confirmation naming the count (spec §D6)
              - Mover lands as a **button only** — one request per selected item,
                and a folder source is a long abortable server-side walk
                (`up2k.py:4590`), so the flow needs progress and cancellation and is
                deferred (see "Decisions pinned here"); tapping it says so rather
                than doing half a move
              - Baixar and Excluir gate on `srvcfg.have_zip` / `have_del` and on
                `perms`; a server started `--no-del` shows no delete
done when:     suite green, no `.py` in the diff, and: long-press enters the mode and
               marks the row, a 7px drag during the press does **not**, select-all
               and invert agree with the visible filter, deleting 3 files issues
               exactly one request and refreshes the listing, and `--no-del` hides
               the button entirely

### Card 6 — Swipe actions and pull-to-refresh
precondition:  Card 5 landed — the swipe handler and the long-press handler share
               the same touch stream and must be written against each other
read for why:  handoff "Interações e gestos" for the exact thresholds; the spec adds
               nothing this card needs
commits:
  1. nu: add swipe actions on the row
     touches: copyparty/web/nu.css, copyparty/web/nu.js
     do:      - left swipe drags to -168px over a track, revealing Link (84px) and
                Excluir (84px); release past -60px opens, otherwise it springs back
              - `transform .22s cubic-bezier(.2,.9,.3,1)`, and `none` while the
                finger is down
              - a tap with a row already open **closes it and does not activate the
                item** — the single most likely mis-tap in the whole design
              - Link copies the file url; Excluir deletes that one file with no
                dialog, because the swipe itself is already two deliberate acts
  2. nu: add pull-to-refresh
     touches: copyparty/web/nu.css, copyparty/web/nu.js
     do:      - only when `scrollTop <= 0`; displacement x0.5, capped at 72px;
                label flips past 48px; release past 48 holds at 48 while
                `fetch_ls()` reruns
done when:     suite green, no `.py` in the diff, and the gesture matrix holds: a
               long-press does not open a swipe, a horizontal swipe does not scroll
               the list, a vertical drag from mid-list does not trigger the pull, a
               pull at the top does not open a swipe, and a tap on a row with
               another row open closes that row instead of opening a file

### Card 7 — The image viewer
precondition:  Card 1 landed
read for why:  handoff §7 for the layout; spec "Out of scope" for what is explicitly
               not in this card
commits:
  1. nu: add the image viewer
     touches: copyparty/web/nu.html, copyparty/web/nu.css, copyparty/web/nu.js
     do:      - tapping an image row or tile opens full screen at that index, with
                name, dimensions, counter and the actions (download, link, delete)
              - loads the original file, not `?th=`
              - **no zoom, no swipe between images, no slideshow** — named as
                missing in the spec; do not invent them here
              - closing returns to the same scroll position
done when:     suite green, no `.py` in the diff, and: tapping an image opens the
               viewer at the right index with the right counter, delete removes the
               file and returns to a refreshed listing, and closing restores the
               previous scroll position

### Card 8 — Recursive search
precondition:  Card 1 landed — the placeholder is a translated string
read for why:  spec §D5 — the gate, the rate limit, and why the promise is
               conditional
commits:
  1. nu: add recursive search on indexed volumes
     touches: copyparty/web/nu.js
     do:      - keep `filtered()` (nu.js:209) as the instant in-folder tier; it is
                the one that answers while you type
              - when `cfg.idx` is true, submitting fires `POST <vpath>?srch` with
                `{"q": "...", "n": N}`, scoped to the current folder and below via
                the DSL's `path` keyword (`u2idx.py:272`), and renders the hits as a
                result list with their paths
              - fires **on submit, debounced, never per keystroke** — the server
                rate-limits consecutive searches with HTTP 429
                (`handle_search`, httpcli.py:3290-3294) and must surface that as a
                readable message, not a silent empty result
              - when `cfg.idx` is false the placeholder keeps saying "in this
                folder" and **no request is ever issued**
done when:     suite green, no `.py` in the diff, and: on an `-e2dsa` volume,
               submitting a query finds a file two folders down and tapping a hit
               navigates to it; on a volume with no index the placeholder does not
               promise recursion and devtools records **zero** `?srch` requests

## Verification (mirrors the spec's §Verification)

Run after Card 8, as the whole-plan check:

- **No server drift.** `git diff 0affcaee..HEAD -- copyparty/*.py` is empty. The one
  template variable the spec allowed turned out to be unnecessary (`cgv1` is already
  passed), so the correct diff is zero Python.
- **The dotfile trap.** Card 2's gate, re-run after everything else landed.
- **The unindexed volume.** Search promises nothing, folder rows degrade to date only
  (`nfiles()`, nu.js:58), thumbnails fall back to chips.
- **The classic UI is untouched.** `?b` reaches the basic browser, `?nu0` escapes, and
  no file under `copyparty/web/` other than `nu.*` appears in the diff.
- **No new files under `web/`.** Every card edits `nu.js` / `nu.css` / `nu.html`. If a
  card ever adds a file there, it must also be added to `RES` (`copyparty/__init__.py`)
  **and** `scripts/sfx.ls`, or it will 404 in dev and vanish from the sfx build.
- **Suite:** `python3 -m unittest discover -s tests` green (31 tests at `0affcaee`).
