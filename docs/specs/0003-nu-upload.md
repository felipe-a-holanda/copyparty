---
number: 0003
type: spec
slug: nu-upload
title: "Upload: nu hosts the real up2k instead of reimplementing it"
status: planejado
created: 2026-08-24
headline: A phone can finally put files into copyparty from the new UI, and a desktop can drag a whole folder onto it, instead of being bounced to the old interface by a button that admits it does not work.
tags: [spec, status/planejado]
par: "[[plans/0003-nu-upload|plan]]"
---

# 0003 — Upload: nu hosts the real up2k instead of reimplementing it

> `nu` is the second filebrowser UI, living beside the classic one (`docs/nu-ui.md`).
> Its base layer landed in `0affcaee`; [0001](0001-nu-the-rest-of-the-mobile-design.md)
> built the ten mobile surfaces and [0002](0002-nu-desktop-is-a-first-class-width.md)
> made width a variable. Both deferred exactly one thing, by name and to this spec:
> **upload**. 0001 §D2 called it "the only piece here with a real new boundary" and
> left the choice — reuse `up2k.js` or reimplement it — deliberately unpinned. 0002
> §out-of-scope parked drag & drop behind the same gate, because "building the drop
> target before the uploader exists would produce a target that swallows files". This
> spec answers the question and builds the answer.

**Status:** planejado — spec only. Today `nu` renders `Enviar arquivos` as a visibly
dead button that routes to `?nu0` (`web/nu.js:2486-2496`, the `["up", ...]` row of
`ACTS`): its `live()` returns `false` on purpose, so the button is tappable and
explains itself rather than hiding. Nothing else about upload exists in `nu` — no
input, no queue, no progress, no drop target. `web/nu.html` loads only
`tl/<lang>.js` and `nu.js` (`:282-284`), so neither `util.js` nor `up2k.js` is on the
page. The plan (`docs/plans/0003-nu-upload.md`) mirrors this number.

---

## The thesis

0001 framed the fork as **reuse `up2k.js` or reimplement it**, and priced reuse at "a
permanent ugly seam between two DOM worlds" and reimplementation at "rewriting the code
paths where a bug loses a user's file". Reading the actual tree collapses both prices,
in opposite directions, and turns a two-way fork into a decided one:

- **The dangerous half of "reimplement" is already a standalone, reusable part.**
  `web/w.hash.js` (125 lines) is a self-contained worker with an explicit message
  contract — `postMessage([nchunk, fobj, car, cdr])` answers
  `["done", nchunk, hslice, len]`, plus `["read"|"fail"|"ferr"|"panic"]`. It resolves
  `crypto.subtle` → `hashwasm` on its own and carries the expensive scars: the Chrome
  GC bug that forgets the `FileReader` output (`gc1/gc2/gc3`), Win10-Defender's
  `NotReadableError`, macOS-Firefox's `NotFoundError`. The build concatenates it into
  the shipped worker (`scripts/make-sfx.sh:611`, `cat w.hash.js >> deps/sha512.hw.js`)
  and `up2k.js` merely does `new Worker('/.cpr/w/deps/sha512.hw.js')` (`:1498`). Any
  client can do the same.
- **But "reimplement" is much more than hashing plus a state machine.** `up2k.js`
  already ships recursive directory traversal for dropped folders (`webkitGetAsEntry`
  → `createReader` → `readEntries`, `:1234-1312`), a `webkitdirectory` input
  (`:1598`), and the whole drop-target wiring (`:1065-1147`). Those are ~250 lines of
  browser edge cases already paid for. Rewriting them buys nothing but a second place
  for the same bugs to live.
- **And "reuse" does not require hiding anything.** The classic UI's upload markup is
  **not static**: `browser.html:69` holds a bare `<div id="op_up2k" class="opview">
  </div>`, and `browser.js:868-947` fills it with 82 lines of generated HTML. The ~47
  element ids `up2k.js` drives are therefore ids *it asks someone to create*, not ids
  welded to the classic page. `nu` can create them itself, in its own sheet, in the
  open.

So the seam 0001 feared — mirroring a hidden DOM into a second UI — is avoidable, and
the rewrite it feared is both unnecessary and larger than advertised. The decision below
takes the third door: **`nu` hosts the real up2k panel as a tenant of the sheet
machinery it already owns.** Zero `.py` diff, zero lines changed in the classic UI, and
the entire chosen scope (drag & drop, whole-folder, dedup, resume) arrives already
proven in production.

## The decisions

### D1 — Host the real up2k; do not mirror it, do not rewrite it

`nu` builds the container `up2k.js` expects, inside its own sheet, and calls
`up2k_init()` (`web/up2k.js:806`). The panel is **visible**, styled by `nu.css`. The
state that drives it is up2k's own and is on screen — there is no second model of the
queue anywhere in `nu`.

The rejected alternatives, and why:

- **Hidden container + a `nu`-drawn mirror.** Buys a 100% `nu` visual at the cost of
  synchronizing two models of the same queue forever, and of breaking silently when the
  classic UI changes a class or an id. The mirror is the seam; hosting removes it.
- **A native `nu` uploader over `deps/sha512.hw.js`.** Defensible, and it was the
  recommendation until the traversal and drop-target code above got counted. It costs
  the state machine *plus* `readEntries` recursion, `webkitdirectory`, the drop wiring,
  and a third copy of `get_chunksize` (`up2k.js:2104` is already a line-for-line twin of
  `up2k.py:5706`). What it buys — no dependency on the classic UI — is bought more
  cheaply by D3's shim and its test.
- **Extracting an `up2k-core.js` shared by both UIs.** Cleanest on paper, but it
  refactors code that has worked for years and puts the risk on the classic UI to save
  code `nu` would otherwise write once. `w.hash.js` is the proof that the part worth
  extracting **was already extracted**; what remains in `up2k.js` is interleaved with
  `U2pvis`, `Donut` and the `u2cards` renderer.

### D2 — The panel is the fifth sheet tenant, not a new component

`nu`'s sheet machinery is already multi-tenant: one veil, at most one open sheet, N
tenants, each an element id plus an optional renderer (`web/nu.js:2403-2419`). `SHEETS`
currently registers four — `nu_sheet` (sort), `nu_menu` (the `⋯` router), `nu_cfg`
(settings), `nu_tsh` (the tree). Upload registers as the fifth. It inherits the veil,
the transition, the Escape handling and the "opening one closes the other" rule for
free, and nothing above it learns that a fifth exists.

The `Enviar arquivos` button stops being dead by the narrowest possible edit to
`ACTS[0]` (`nu.js:2486`): `live()` returns the same `perms.indexOf("write")` test
`mkdir` already uses one row below (`:2499`), and `do()` opens the sheet instead of
navigating to `?nu0`. The two-function shape of that table — `show()` for "does the
button exist", `live()` for "does it look available" — was built by 0001 §D2 *for this
moment*; this spec is the moment.

**Progress when the sheet is closed** rides the status line that already exists
(`render_stat`, `nu.js:1899`), which today shows counts and the sort criterion. It gains
one more state: `3/7 · 62%` while a queue is running, tapping it reopens the sheet. A
persistent footer strip was considered and dropped — it would add a permanent box to a
layout that 0001 and 0002 spent two specs keeping honest, to show what one line of an
existing surface can already say.

### D3 — The shim is the only genuinely new boundary, and it is seven symbols

`up2k.js` is not standalone: it reaches into `browser.js` for a small, countable set of
globals. Every reach, measured:

| Symbol | Where `up2k.js` calls it | What it wants |
|---|---|---|
| `treectl.goto` / `treectl.onscroll` | `:1874`, `:57` | re-list the folder after an upload lands |
| `fileman.render` | `:3496` | redraw the file list |
| `msel.getsel` | `:1873` | "is anything selected" before auto-refreshing |
| `apply_perms` | `:3494` | hand it `{perms, frand, u2ts}` at init |
| `start_actx` / `actx` | 11 sites, `:1024`..`:3433` | the `AudioContext` keep-alive hack (defined `browser.js:2760-2768`) |
| `wintitle` | `:691`, `:712`, `:745` | write progress into `document.title` |
| `go2up2k` / `go2bup` | `:879-880` | the two buttons of the https-warning modal |

That table **is** the new code: a shim object per row, each mapping to `nu`'s own
equivalent (`treectl.goto` → `nu`'s re-listing, `fileman.render` → `nu`'s renderer,
`actx` → an 8-line copy or a no-op, `go2bup` → the `?nu0` route the dead button used to
take). It is small, but it is a **real boundary**, not a thin seam, because it is a
private interface of another file: if the classic UI renames one of these, `nu` breaks
with no compile error and no test failing anywhere near the change.

**So the shim ships with a test that asserts the boundary**, not just the behavior: mount
the panel, assert every id in the expected set exists, and assert each shim symbol is
reached. That test is what converts a silent break into a loud one, and it is the reason
D1 can prefer hosting over a native rewrite without accepting an invisible dependency.

### D4 — `L` needs a baseline, because English lives in `browser.js`

`up2k.js` reads ~98 `L.<key>` strings **directly**, not through a `t()` accessor. `nu`
defines `var L = Ls[lang] || null` and `t(k) → (L && L[k]) || Ls.eng[k] || k`
(`nu.js:229-233`), where `nu`'s `Ls.eng` is `nu`'s own dictionary of `nu_*` keys. The
translated dictionaries in `web/tl/*.js` do carry the up2k keys (`por.js` has `ut_mt`,
`u_hashdone`, `ul_par`), but **the English baseline for them lives inside `browser.js`**
(`:167`, `:265`, `:613`, ...), which `nu` does not load. On an English server,
`L.ut_mt` would render the string `undefined` into the panel.

The decision: **bring the baseline, do not bypass it.** `nu` ships the up2k slice of
`Ls.eng` alongside its own, so `t()`'s existing fallback chain works unchanged and a
missing key degrades to the key name — the per-key fallback 0001 built (`f3ca08f9`)
already has exactly this failure mode designed. Patching `up2k.js` to call `t()`
instead of `L` is rejected: it edits the classic UI, which D1 spends its whole budget
avoiding.

### D5 — Resume is the protocol's, and the queue does not survive a reload

The scope asked for "resume between sessions". Half of it is free and half of it is
impossible, and the spec says which is which rather than promising both:

- **Free:** resume within the transfer. The re-handshake returns exactly the chunks the
  server is still missing (`httpcli.py:3150` for the handshake, `:3331` for the chunk
  POST with `X-Up2k-Hash`/`X-Up2k-Wark`), so a dropped connection costs the current
  chunk, not the file. Nothing in `nu` implements this; it is the protocol.
- **Impossible as asked:** a queue that survives closing the tab. A `File` obtained from
  an `<input>` or a drop cannot be reopened after a reload — the browser requires a new
  user gesture. This is why the classic UI does not do it either: it warns instead
  (`beforeunload` → `warn_uploader_busy`, `up2k.js:1883`). `nu` inherits that warning.
- **What is actually deliverable, and is out of scope here:** remembering the *list*
  (names, sizes, warks) so that reselecting the same files skips what already landed.
  The server-side half of that already works for free via the re-handshake; only the
  bookkeeping would be new. Deferred, not rejected — see Out of scope.

`localStorage` therefore holds no queue in this spec. It holds what it already holds for
up2k: preferences (`nthread`, `u2sz`, `u2ow` — `up2k.js:918`, `:3139`, `:3169`).

## What is genuinely new, versus what is merely reused

**New — the whole of it:**

- the sheet tenant: the container, the 82-line markup block, and its registration in
  `SHEETS` (`nu.js:2412`);
- the shim of D3 — seven symbols and their test;
- the up2k slice of `Ls.eng` (D4);
- two edits to `ACTS[0]` (`nu.js:2486-2496`): `live()` and `do()`;
- one new state in `render_stat` (`nu.js:1899`);
- the `nu.css` rules that style the 47 ids into `nu`'s visual language.

**Reused, not rebuilt — named so this spec cannot be read as a rewrite:**

- chunked hashing with its three-tier fallback and workers — `web/w.hash.js` +
  `deps/sha512.hw.js`, instantiated at `up2k.js:1498`;
- the handshake / chunk / re-handshake state machine — `exec_handshake` (`:2518`),
  `exec_upload` (`:2876`), `exec_head` (`:2456`), `exec_hash` (`:2120`);
- `get_chunksize` (`:2104`), the client twin of `up2k.py:5706`;
- drag & drop and recursive folder traversal (`:1065-1147`, `:1234-1312`) and the
  `webkitdirectory` input (`:1598`) — this is how 0002's deferred drop target and the
  whole-folder scope arrive at once;
- dedup, the `u2ts` / `lifetime` / `frand` volume options, and the busy-tab warning;
- `nu`'s own sheet machinery, `perms` gate, status line and i18n fallback, all from
  0001/0002.

## What the server must provide

**Nothing. Zero `.py` diff.** Both upload paths already exist and are first-class:
`handle_post_json` for the handshake (`httpcli.py:3150`), `handle_post_binary` for the
chunk POST (`:3331`), and the multipart `act=bput` basic upload (`handle_plain_upload`,
`:3881`) which this spec does not use. The permission gate is `write`, already delivered
to the page (`nu.html:271`) and already tested by `mkdir` (`nu.js:2499`). `nu` continues
its record of adding no server logic.

The one non-`.py` server-side change: `nu.html` must load `util.js` and `up2k.js`
(mirroring `browser.html:153-159`), which `nu.html` deliberately does not today. That is
+169 KB of unminified JS on a page that currently ships 157 KB — see Open questions.

## Out of scope (named, deferred)

- **A `nu`-native uploader.** D1 rejects it *for now*, on the evidence of the tree as it
  stands. If the shim of D3 starts breaking on classic-UI changes, that is the signal to
  reopen — the test is the tripwire.
- **Remembering the queue across a reload** (D5's third bullet). Deliverable, but it is
  bookkeeping over a protocol feature that already works, and it earns its own spec once
  someone actually loses a queue.
- **The `⋯` rows upload unlocks.** `Undo a recent upload` (`unpost`) and
  `Recent uploads` (`rups`) are already declared and disabled in the router
  (`nu.js:146-148`); with upload alive they become answerable, but each needs its own
  small flow. `nu` gains an uploader here, not an upload history.
- **Shares, the control panel, the media player, rename and move.** Unchanged by this
  spec, still parked by 0001 §D1 and `docs/nu-ui.md:299-313`.
- **Basic (`bput`) upload as a fallback** for browsers where the worker or `subtle`
  path fails. `up2k.js` already degrades through its own tiers; adding a fourth path is
  speculation until a real browser fails.

## Open questions

- **Payload.** Loading `util.js` (60 KB) + `up2k.js` (109 KB) roughly doubles `nu`'s JS
  on every page view, including views that never upload. Lazy-loading both on first tap
  of `Enviar arquivos` is the obvious answer and costs a loading state in the sheet;
  loading them eagerly costs bytes on a phone. Not pinned here because the honest input
  is a measurement on a real connection, not an opinion.
- **How much of the up2k panel `nu` should hide.** The generated markup carries switches
  that are classic-UI vocabulary (`multitask` 🏃, `potato` 🥔, thread count, `fsearch`).
  Hiding them narrows the panel to what a phone needs; keeping them preserves parity and
  avoids `nu` deciding for the user. Pin it when the panel is first styled, against the
  real thing.
- **Whether the shim should be a file or a section of `nu.js`.** A `nu-up2k-shim.js`
  makes the boundary of D3 physically visible; a section of `nu.js` keeps `nu` one file,
  as it is today. Cosmetic until the shim grows past the seven symbols.

## Commit sketch (NOT session cards — `/planc` expands these)

1. Load `util.js` and `up2k.js` from `nu.html`; assert `nu` still boots green with them
   present and nothing calling them.
2. Add the up2k slice of `Ls.eng` to `nu.js` and prove `t()`'s fallback chain covers the
   ~98 keys (D4).
3. Build the shim: the seven symbols of D3, each mapped to `nu`'s equivalent, plus the
   test that asserts the boundary.
4. Mount the container and the 82-line markup block inside a new `nu_upl` sheet; register
   it as the fifth tenant of `SHEETS` (D2).
5. Call `up2k_init()` behind the sheet's first open; wire `ACTS[0]`'s `live()` and `do()`
   so the dead button comes alive under `perms.write` (D2).
6. Style the 47 ids into `nu`'s visual language in `nu.css`.
7. Add the queue state to `render_stat` so a closed sheet still shows `3/7 · 62%` (D2).
8. Wire the desktop drop target to up2k's existing drop handlers — 0002's deferred
   gesture, now that the uploader it would have fed exists (D1, 0002 §out-of-scope).
9. Update `docs/nu-ui.md`: upload leaves "what is NOT built yet" and the `classic UI`
   link stops being the answer for uploading.

## Verification (how to prove it, when it lands)

- The suite stays green and the diff contains **no `.py`** — the same bar 0001 and 0002
  cleared.
- The boundary test of D3 fails loudly if any of the seven symbols or the expected ids
  goes missing.
- A live walk at 390×844 and 1440×900: upload one file, upload seven, cancel mid-queue,
  drop a folder on the desktop band, and confirm a re-upload of an already-present file
  is deduped by the handshake rather than re-sent.
- On an English-language server, no `undefined` appears anywhere in the panel (D4).
- With a user lacking `write`, the button does not render at all — `show()`, not a dead
  `live()`. A permission the server refuses is not a `nu` gap and must not look like one
  (the rule `SACTS`' delete row already states, `nu.js:2534-2537`).
