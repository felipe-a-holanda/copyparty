---
number: 0003
type: plan
slug: nu-upload
title: "Upload: nu hosts the real up2k instead of reimplementing it"
status: planejado
created: 2026-08-25
tags: [plan, status/planejado]
par: "[[specs/0003-nu-upload|spec]]"
---

> Five sessions that make `nu` a host for the classic uploader instead of a UI that
> apologizes for not having one: one bootstrap, one 142-key English baseline, the DOM
> `up2k.js` demands, the shim it reaches through, the ordered injection that brings it
> alive, and the CSS that makes it look like `nu`. Zero `.py` diff, zero lines changed
> in the classic UI, no new file under `web/`.

## Context

`nu` is the second filebrowser UI (`docs/nu-ui.md`); its base layer landed in
`0affcaee`, [0001](../specs/0001-nu-the-rest-of-the-mobile-design.md) built the ten
mobile surfaces and [0002](../specs/0002-nu-desktop-is-a-first-class-width.md) made
width a variable. Both deferred **upload** by name to spec 0003.

Read `docs/specs/0003-nu-upload.md` for the *why* — it is hardened against `3defa788`
and its six decisions are not relitigated here. This file is the *how it lands*.

What is in the tree today, verified at `7b928330`:

| fact | anchor |
|---|---|
| `Enviar arquivos` is a rendered-dead button routing to `?nu0` | `copyparty/web/nu.js:2486-2496` (`ACTS[0]`, `live()` returns `false`) |
| `nu.html` loads `tl/<lang>.js` and `nu.js`, nothing else of the classic UI | `copyparty/web/nu.html:282,284` |
| `nu.html`'s bootstrap binds `srvcfg = {{ cgv1 }}` **raw** — no `CGV1`, no `CGV`, no `JS_NONCE` | `copyparty/web/nu.html:257-276` |
| `SHEETS` has four tenants; a tenant is an id plus an optional renderer | `copyparty/web/nu.js:2412-2417`, `sheet()` at `:2419` |
| `mkdir`'s `show()` already carries the `write` test one row below `ACTS[0]` | `copyparty/web/nu.js:2499` |
| `nu.js` and `util.js` collide on exactly four top-level names | measured: `ebi`, `esc`, `humansize`, `setck` |
| `nu.js` and `up2k.js` collide on **none** | `up2k.js` declares 11 top-level names, all `up2k*`/`Donut`/`U2pvis`/`sfx_nice`/`J_U2K` |
| `web/ui.css`, `web/up2k.js`, `web/util.js` are already shipped assets | `copyparty/__init__.py` `RES`; `scripts/sfx.ls` |
| the suite is 31 tests, green | `python3 -m unittest discover -s tests` |
| `web/deps/sha512.hw.js` is **not in this tree** — gitignored, built by the deps recipe | `.gitignore:30`; `web/deps/` holds only `sha512.ac.js.gz` + `busy.mp3.gz` |

Three files change, and only three: `copyparty/web/nu.js`, `nu.css`, `nu.html`, plus
`docs/`. **Any `.py` in the diff, or any new file under `web/`, is the signal to stop
and reopen the spec.**

## Decisions pinned here (the spec's three open questions)

### Which up2k switches `nu` shows — pinned: all rendered, most behind one disclosure

The *mechanism* was already decided by the spec (D3 Part 3): every id in the contract is
rendered, and hiding is `display:none`, never a markup omission — `bcfg_get` returns
`defval` **without reading storage** when the node is absent (`util.js:1314-1317`), so
dropping `#hashw` throws away the user's saved value on every load, in silence.

What was open is *which* to show. Pinned:

- **Always visible:** the drop/pick button (`u2btn` + `u2bm`), the progress block
  (`u2etaw`/`u2etas`/`u2etah`/`u2etau`/`u2etat`), the queue table (`u2tabw`/`u2tab`/`u2mu`),
  the five `u2cards` counters, `u2foot`, `u2life`, `u2notbtn`, `u2flagblock`, `u2err`.
- **Behind one disclosure inside the panel** — a `<button>` that toggles a class on the
  panel root, labelled by one new `nu_*` key: the whole `#u2conf` row (`multitask`,
  `potato`, `u2rand`, `u2ow`, `fsearch`, `nthread`) and the eleven `op_cfg` upload
  toggles plus `u2szg`.
- **`display:none` at every width, never omitted:** `#ops` (the tab bar `Donut` writes
  into — see below, it is also the pump that drives the status line), `#op_up2k`'s
  chrome, `#repl`, `#ico1`.

A phone gets a panel with one button and a queue; the switches are one tap away and
their saved values survive. This is a first cut against the real thing, revisable in
its own commit — it is CSS, not markup.

### Shim + loader: a file or a section of `nu.js` — pinned: a section of `nu.js`

A new `copyparty/web/nu-up2k.js` would need a row in the `RES` manifest
(`copyparty/__init__.py:65-143`) **and** a row in `scripts/sfx.ls`'s alphabetical list —
the exact reason 0002's plan gave for never adding a file under `web/`
(`0002:722-726`) — plus a `<script>` tag whose position in `nu.html` would have to dodge
the `Ls` clobber of D6. `nu` stays one file. The boundary is made visible by a banner
comment and by the self-check that names it, not by a filename.

### The crash overlay `util.js` installs — pinned: keep it

`util.js:307` does `window.onerror = vis_exh` at import, and `nu` has no `window.onerror`
of its own — a crash in `nu` today is a frozen UI and a silent console. `vis_exh` is
self-contained: it creates `#exbox` and appends its own `<style>` (`util.js:270-283`), so
it needs no markup and no `ui.css`, and inline `<style>` is unaffected by the default
`--csp-ui` (which declares only `script-src` and `worker-src`, `__main__.py:1706`).
Restoring `window.onerror = null` after the injection would silence a crash inside
`up2k.js` — the code most likely to produce one. Kept, and named in `docs/nu-ui.md` as a
behavior change from the first open of the sheet onward.

## What the investigation changed about the shape

Seven findings that move work, change how a commit is written, or correct a number the
spec carries.

### The `L` slice is **142 keys, not 98** — the markup needs its own set

The spec's D4 counted the keys `up2k.js` dereferences: 98, and that number is right
(`grep -oE '\bL\.[a-zA-Z0-9_]+' web/up2k.js | sort -u | wc -l` → 98). But `nu` is also
generating the markup that `browser.js:867-947`, `:959-971` and `:1038-1054` generate,
and **that markup carries 45 more `L.*` reads of which only one is in the 98** —
`udt_drop`. `ul_par`, `ut_mt`, `ut_pot`, `ut_rand`, `ut_ow`, `ut_srch`, `ut_par`,
`ul_btn`, `ul_hash`/`ul_send`/`ul_done`/`ul_idle1`, `ut_etah`/`ut_etau`/`ut_etat`, the
five `uct_*`, the six `utl_*`, `ul_flagblk`, `udt_up`, `udt_srch`, `ut_ask`, `ut_u2ts`
and the eight `cut_*` are **not** read by `up2k.js` — they are read by the code that
builds the panel, which is now `nu`'s code.

The union is **142**. Measured against the tree:

- all 22 files in `web/tl/` carry **142/142** (checked against `por`, `nor`, `chi`);
- `browser.js`'s `Ls.eng` (`:11-1237`, 575 keys) carries **142/142** — it is the source;
- `nu`'s `Ls.eng` (`nu.js:46-221`, 120 keys) carries **0/142**, and **collides with none
  of them** — so the slice is a pure addition, not a merge.

Shipping only 98 would render `undefined` into every label, tooltip and column header of
the panel on an English server, which is the exact failure D4 exists to prevent.

### `ui.css` is 10 KB, not 61 — and it must be injected **before** `nu.css`, not after

Two corrections, one of them load-bearing.

`ui.css` is **10,471 bytes / 646 lines**, not the 61 KB D6 quotes (that is `nu.css`'s
size). The lazy-injection budget is `util.js` 59 KB + `up2k.js` 106 KB + `ui.css` 10 KB
≈ **175 KB unminified**, against `nu.js`'s 154 KB. D6's argument gets cheaper, not
weaker.

The load-bearing half: **`ui.css:1-10` declares `--fg` on `:root`**, and so does
`nu.css:23` (`#16171a` light, `#edeef2` dark). A stylesheet appended to `<head>` sits
*after* `nu.css`'s `<link>` (`nu.html:9`) in document order, so it **wins every tie** —
from the first open of the upload sheet on, every `nu` surface reading `var(--fg)` would
flip to `#ccc`. Two more of `ui.css`'s rules reach `nu`'s own chrome the same way:
`input, button { font-family: var(--font-main), sans-serif }` (`:385-387`) and
`input[type="text"]:focus { box-shadow: 0 .1em .3em #fc0 … }` (`:389-394`) — a yellow
glow on `nu`'s search box.

The fix is not a rule, it is a **position**: inject the `<link>` with
`document.head.insertBefore(link, document.head.firstChild)`, not `appendChild`. Cascade
order for author sheets follows the document order of their elements, not the order they
were inserted, so `nu.css` — and the admin's `--css` override after it — win every tie,
while `ui.css`'s rules for `#tt`, `#toast`, `#toastb` and `#modal` (which `nu.css` does
not define at all: zero matches) still apply. Two same-specificity rules in `nu.css` mop
up what has no tie to win (the `input, button` font and the `:focus` glow).

`util.js` has **no `import_css`** — only `import_js` (`:442-456`). The `<link>` is
`nu`'s own three lines.

### `esc` and `setck` are collisions, not equivalences

D6 calls three of the four name collisions "identical" or "equivalent". `ebi` is
identical (`document.getElementById.bind(document)` in both). The other two are not:

- **`esc`** — `nu.js:19` is `String(t == null ? "" : t).replace(…)`; `util.js:112` is
  `txt.replace(…)`, which **throws on `null`, `undefined` and any number**. `nu` has 53
  call sites; today they all happen to pass strings, so this is a latent crash and not a
  live one — which is exactly the kind that lands months later, in the one branch nobody
  walked.
- **`setck`** — `nu.js:618` uses `xhr.onloadend` and guards the callback; `util.js:1377`
  uses `xhr.onload = cb`, which **does not fire on a network error**. `nu`'s `unpin()`
  passes a callback that navigates (`nu.js:625-627`); under `util.js`'s version a failed
  request leaves the user on a page whose cookie was not cleared and no redirect.
- **`humansize`** is the one D6 gets right and the worst: different arity, different
  semantics, and `up2k.js` calls it *with* the second argument at `:1666`, `:1677`,
  `:1742`.

Pinned: rename all three of `nu`'s (`esc` → `nu_esc`, `setck` → `nu_setck`, `humansize`
→ `nu_hsz`) and leave `ebi` alone — renaming an identical binding at ~400 call sites is
noise that hides the three renames that matter. `util.js`'s bare `var L, tt, treectl,
thegrid, up2k, …` (`:26`) is **not** a collision: a `var` redeclaration with no
initializer does not reset an existing binding, so `nu`'s `L` (`nu.js:229`) and the
shim's `treectl` survive `util.js` loading over them.

### `CGV` is unnecessary; `CGV1` should be an alias, not a second parse

D3 Part 1 asks for both `CGV1 = {{ cgv1 }}` and `CGV = {{ cgv|tojson }}`.

`CGV1` is required and its ten globals are confirmed keys of `js_htm`
(`authsrv.py:3285-3341`: `turbolvl`, `nosubtle`, `u2j`, `u2sz`, `u2ts`, `u2ow`, `frand`,
`lifetime`, `u2sort`, `have_up2k_idx`). But `srvcfg` at `nu.html:266` is **already that
object** — declaring `CGV1 = {{ cgv1 }}` beside it parses the same JSON twice and hands
the page two objects that must not drift. Pinned: `CGV1 = {{ cgv1 }}, srvcfg = CGV1` —
one parse, two names, one object.

`CGV` carries exactly three keys for the `nu` template (`httpcli.py:7327-7331`:
`ls0`, `acct`, `perms`), and **all three are already bare globals** in `nu.html`
(`:271-275`). The spray would add nothing and would replace `window.ls0` with a *second
parse* of a listing that can be thousands of entries. Pinned: **declare `CGV1` only**,
and say so in a comment so the next reader does not "fix" the omission.

`JS_NONCE` is required and free: `js_nonce` is in `ka` for every template
(`httpcli.py:348`), so `JS_NONCE = "{{ js_nonce }}"` is one line and zero `.py`.

### `#op_up2k` must carry `act`, and `#ops` is also the progress pump

`QS('#op_up2k.act')` is tested at three places, and at `up2k.js:3491` it is the **only**
thing that calls `goto_up2k()` → `init_deps()`, which is what imports the main-thread
hasher fallback (`:846`). Without the `act` class the panel still works wherever
`crypto.subtle` is available (`got_deps()` short-circuits, `:835`), and silently loses
its fallback everywhere else — over plain http, on the browsers the tier exists for.
Pinned: `nu`'s generated wrapper is `<div id="op_up2k" class="act">`.

And `Donut` is not only a contract cost. `Donut.do` (`up2k.js:697-728`) is added to
`timer` while a queue is busy (`:1892`) and calls `wintitle("{0}%, {1}, #{2}, ")`
(`:712-713`) ten ticks apart — but only if `el = QS('#ops a .donut')` resolved
(`:687`, `r.do` returns early at `:698` when it did not), which happens once
`optab.innerHTML = svg()` has written the `<circle class="donut">` (`:669`). So the
`#ops` anchor `nu` must render anyway **is** the thing that keeps a progress callback
firing. D2's `3/7 · 62%` is fed by the shim's `wintitle`, not by a second timer and not
by reading up2k's private `st` (which is not on the returned object: `up2k_init` returns
only `tact`, `init_deps`, `set_fsearch`, `gotallfiles`, `:806-810`).

### Three of the shim's ten symbols are inside a `try`, and one of them is worth building

`up2k.js:1872-1876` wraps `msel.getsel()`, `mp.au` and `treectl.goto()` in a bare
`try { … } catch (ex) {}`. So those three are *safe* to omit — but `treectl.goto()` is
the call that re-lists the folder when a queue drains, which is the behavior `nu` wants:
a finished upload should appear in the listing. Pinned: the shim implements
`treectl.goto()` as `nu`'s own re-fetch, `msel.getsel()` as `[]` and `mp.au` as `null` —
so the guard passes and the refresh happens.

`treectl.onscroll()` is **not** in a try: it is called at `up2k.js:57`, top level,
before any function of the page has run. It must exist and be a no-op.

### Two small things the spec's tables would send you looking for

- **`acc_info` is commented out.** `up2k.js:1646` is `//ebi('acc_info').innerHTML = …`.
  A required-id list built by grepping `ebi\('…'\)` will include it and the self-check
  will then demand a node nothing reads. The list is 47 grep hits; the required set is
  smaller, and this is one of the subtractions.
- **`QS('label[for="u2ow"]')` is dereferenced unguarded** at `up2k.js:921` (`set_ow`,
  called at `:935` during init). The `<label>` beside `#u2ow` is part of the contract,
  not decoration — the same is true of `label[for="fsearch"]`. Neither is an id, so
  neither shows up in an id sweep.

## The contract, in one place

What Card 2 must render and Card 3 must check. Anything not here is either created by
`up2k.js` itself (`u2depmsg` `:854`, `actx_go` `:1585`, `u2depotato`/`u2enpotato`
`:441-442`, `undor` `:3222`, `nagtest` `:3430`, `lifes`) or arrives inside a `L` string
(`lifem`/`lifeh`/`lifew`/`u2nah`/`u2yea` — Card 1's slice, no markup can supply them).

**Ids — the panel** (`browser.js:867-947`): `u2form`, `u2conf`, `multitask`, `potato`,
`u2rand`, `u2ow`, `fsearch`, `u2btn_cw`, `u2c3w`, `nthread`, `nthread_add`,
`nthread_sub`, `u2notbtn`, `u2btn_ct`, `u2btn`, `u2bm`, `u2c3t`, `u2etaw`, `u2etas`,
`u2etah`, `u2etau`, `u2etat`, `u2cards`, `u2tabw`, `u2tab`, `u2mu`, `luplinks`,
`cuplinks`, `u2flagblock`, `u2life`, `u2foot`.

**Ids — the drop overlay** (`browser.js:959-971`, dereferenced unguarded at
`up2k.js:1140-1150`): `drops`, `up_dz`, `srch_dz`, `up_zd`, `srch_zd`.

**Ids — the config panel** (`browser.js:1038-1054`): `ask_up`, `u2ts`, `umod`, `hashw`,
`nosubtle`, `u2turbo`, `u2tdate`, `u2szg`, `flag_en`, `u2sort`, `upnag`, `upsfx`,
`ico1`.

**Ids — the page furniture** (`browser.html`): `u2err` (`up2k.js:867-872`), `op_up2k`
**with class `act`** (`:3335` unguarded, `:3491`), `repl` (`:396`, `:1963` — both read
`.offsetTop` unguarded), `ops` (`:3064`, `getComputedStyle`).

**Non-id nodes:** `#ops a[data-dest="up2k"]` with non-empty `textContent`
(`up2k.js:638-640`), `label[for="u2ow"]` (`:921`), `label[for="fsearch"]` (`set_fsearch`).

**Symbols on `window`:** `treectl` (`.onscroll`, `.goto`), `fileman` (`.render`), `msel`
(`.getsel`), `mp` (`.au`), `wintitle`, `go2up2k`, `go2bup`, `goto`, `start_actx`, `actx`
(`null` **or** a real `AudioContext` — never a stub: `up2k.js:735` guards on
`actx && actx.state != 'suspended'` and `sfx_nice()` calls `actx.createOscillator()`),
`ACtx`, `apply_perms`.

## Sessions  ·  one card = one fresh session; a card may land several commits; git carries state between cards

Single lane: every card edits `copyparty/web/nu.js`, and Cards 1, 2 and 5 also edit
`nu.html` / `nu.css`, so the touches collide by construction and the cards run in
sequence. No `lane:` stamps.

There is no JS test harness in this repo (`tests/` is Python-only, no `package.json`,
no headless browser — which is why D3's tripwire is a runtime self-check and not a test
file). So each card's gate is the Python suite (**31 tests**, proving nothing regressed)
plus a named, falsifiable manual check at **390×844 and 1440×900**, the two viewports
0002 established. Serve a test volume with `-e2dsa`.

**Before Card 4, put the hasher in the tree.** `web/deps/sha512.hw.js` is gitignored and
absent; `up2k.js:1498` creates every hash worker from that URL. Run
`./scripts/make-sfx.sh fast dl-wd` (or `make -C scripts/deps-docker`) once — Cards 1-3
do not need it, Cards 4 and 5 cannot be proven without it.

### Card 1 — The bootstrap, the rename, and the English baseline
precondition:  none — first card
read for why:  spec §D3 Part 1 (why `util.js`'s spray is the fix and not a shim) and
               §D4 (why `t()`'s per-key fallback does **not** protect `up2k.js`, which
               dereferences `L` directly); this plan's §"The `L` slice is 142 keys" and
               §"`CGV` is unnecessary"
model:         sonnet
commits:
  1. nu: declare CGV1 and JS_NONCE in the bootstrap block
     touches: copyparty/web/nu.html  (only these)
     do:      - in the bootstrap script (`nu.html:257-276`), replace
                `srvcfg = {{ cgv1 }}` with `CGV1 = {{ cgv1 }}, srvcfg = CGV1` — one
                parse, two names, **one object**. `srvcfg` is read throughout `nu.js`
                and must keep working; `CGV1` is what `util.js:16-17` sprays onto
                `window` to make `nosubtle`, `frand`, `u2ts`, `u2sz`, `u2ow`, `u2j`,
                `lifetime`, `turbolvl`, `u2sort` and `have_up2k_idx` exist as bare
                globals. Keep the existing comment about `|tojson` — it is still the
                reason the value is interpolated raw
              - add `JS_NONCE = "{{ js_nonce }}"` beside `SR`/`TS`. `js_nonce` is in
                `ka` for every template (`httpcli.py:348`), so this is zero `.py`.
                `import_js` stamps it only `if (window.JS_NONCE)` (`util.js:446-447`),
                and without it the dep import of `up2k.js:846` is blocked by the
                default `--csp-ui` (`__main__.py:1706`)
              - do **not** declare `CGV`: its three keys for this template are `ls0`,
                `acct` and `perms` (`httpcli.py:7327-7331`), all three already bare
                globals two lines below, and the spray would replace `ls0` with a
                second parse of the whole listing. Say so in a comment
  2. nu: rename the three helpers util.js would clobber
     touches: copyparty/web/nu.js
     do:      - `esc` → `nu_esc` (53 call sites). `util.js:112` is `txt.replace(…)` and
                **throws** on `null`/`undefined`/a number, where `nu.js:19` coerces —
                a latent crash, not an equivalence
              - `setck` → `nu_setck` (`nu.js:618`, callers at `:625` and the dotfiles
                toggle). `util.js:1377` uses `xhr.onload`, which never fires on a
                network error, so `unpin()`'s navigating callback would be dropped
              - `humansize` → `nu_hsz` (`nu.js:481`, callers at `:1930`, `:2079`,
                `:2080`, `:3345`). This one is not subtle: `util.js:1006` takes
                `(b, tersity)`, formats through `HSZ_U`, ignores `nu_szfmt`, and
                `up2k.js` calls it *with* the second argument at `:1666`, `:1677`,
                `:1742`
              - leave `ebi` alone — `util.js:83` is the identical binding, and
                renaming ~400 call sites would bury the three renames that matter
              - a comment above the three naming `util.js`'s line numbers, so the next
                reader does not rename them back
  3. nu: add the up2k slice of Ls.eng
     touches: copyparty/web/nu.js
     do:      - extract the key list mechanically, not by eye:
                `grep -oE '\bL\.[a-zA-Z0-9_]+' copyparty/web/up2k.js` gives 98, and the
                same grep over `browser.js:867-947`, `:959-971` and `:1038-1054` gives
                45 more of which only `udt_drop` overlaps — **142 unique**
              - copy each key's value **verbatim** out of `browser.js`'s `Ls.eng`
                (`:11-1237`) into `nu.js`'s `Ls.eng` (`:46-221`). Zero of the 142
                collide with `nu`'s 120 existing keys, so this is a pure append
              - **five of them are markup and the ids inside them are contract**:
                `u_life_cfg` carries `<input id="lifem">`/`<input id="lifeh">`
                (`up2k.js:3222` writes the block then reads both back), `u_life_est`
                carries `<span id="lifew">` (`:3281`), `u_ancient` carries
                `<a id="u2nah">` (`:880`), `u_su2k` carries `<a id="u2yea">` (`:879`).
                A "cleaned up" copy breaks the thing it names, and no markup commit can
                supply those ids
              - add exactly **one** new `nu_*` key of `nu`'s own: the label for the
                switches disclosure the panel gets in Card 5
done when:     `python3 -m unittest discover -s tests` green (31), no `.py` in the diff,
               and in the console on a default (`eng`) server: `window.CGV1 === srvcfg`
               is `true`; `JS_NONCE` is a non-empty string; `window.CGV` is `undefined`;
               `typeof humansize`, `typeof esc` and `typeof setck` are all
               `"undefined"`; and a paste of the 142-key list resolves with **zero**
               misses — `keys.filter(function(k){return Ls.eng[k]===undefined})` is
               empty, and so is the same filter against `Ls.por` on a `--lang por`
               server. At 390×844 and 1440×900 the listing, the sizes in the status
               line and every sheet are byte-identical to `7b928330`

### Card 2 — The fifth sheet tenant, and the DOM up2k demands
precondition:  Card 1 landed — `Ls.eng` answers all 142 keys, so the generated markup
               has strings to interpolate instead of `undefined`
read for why:  spec §D2 (why the panel is a tenant of `sheet()` and why the sheet
               element is static markup) and §D3 Part 3 (why hiding is a CSS act and
               omitting a node discards the user's saved value); this plan's
               §"The contract, in one place" and §"`#op_up2k` must carry `act`"
model:         opus
commits:
  1. nu: add nu_upl as the fifth sheet tenant
     touches: copyparty/web/nu.html, copyparty/web/nu.js
     do:      - `<section id="nu_upl" hidden aria-modal="true" role="dialog"
                aria-labelledby="nu_uplh">` in `nu.html`, beside its four siblings
                (`:108`, `:123`, `:142`, `:165`), with the same `.nu_grip` +
                `.nu_shead` shell the sort and tree sheets use, an `<h2 id="nu_uplh">`
                and one empty `<div id="nu_uplb">` for the generated body.
                **Static markup, not a renderer-only tenant**: `sheet()` does `ebi(id)`
                and returns silently if the node is missing (`nu.js:2420-2422`)
              - register `nu_upl: render_upl` in `SHEETS` (`nu.js:2412-2417`).
                `render_upl` is a stub in this commit — it mounts nothing yet
              - the header string goes through `t()` at boot like every other string
                `nu.html` carries
              - **do not touch `ACTS[0]`** — the button stays dead until Card 4's
                loader works. A live button over a panel that cannot initialize is
                worse than the honest dead one
  2. nu: generate the up2k panel's DOM into the sheet
     touches: copyparty/web/nu.js
     do:      - one `mount_upl()` that writes `#nu_uplb`'s `innerHTML` once, idempotent
                on a mounted flag. Every id of §"The contract"'s first and third blocks,
                **in the nesting `browser.js:867-947` and `:1038-1054` use** — `u2btn`
                inside `u2btn_ct`, `u2etaw`/`u2cards` inside `u2c3t`, `u2tab` inside
                `u2tabw`, `u2bm` inside `u2btn` — because `onresize` (`up2k.js:3062-3085`)
                *moves* those nodes between `u2btn_ct`/`u2btn_cw` and `u2c3t`/`u2c3w`
                and compares `parentNode`
              - both `<label for="u2ow">` and `<label for="fsearch">`:
                `QS('label[for="u2ow"]').innerHTML` is dereferenced unguarded in
                `set_ow` (`up2k.js:921`, called at `:935`)
              - the eleven config toggles plus `u2szg` and `ico1` are rendered as the
                same `<a class="tgl btn">` / `<input type="text">` shapes
                `bcfg_bind`/`fcfg_get` expect. **Every one of them, always** — a missing
                node makes `bcfg_get` return `defval` without reading storage
                (`util.js:1314-1317`), which throws away the user's saved preference on
                every load, in silence
              - strings come from `L`, never `t()`: these are the classic UI's keys and
                Card 1 put all 142 in `Ls.eng`, so `L[k]` resolves at every language
                the same way it does for `browser.js`
  3. nu: mount the drop overlay and the page furniture up2k reaches for
     touches: copyparty/web/nu.js
     do:      - append the `#drops` block (`up_zd`, `srch_zd`, `up_dz`, `srch_dz`) to
                `<body>`, outside the sheet: `ebi('up_dz')`, `ebi('srch_dz')` and
                `ebi('drops')` are dereferenced with no guard at the top level of
                `up2k_init` (`up2k.js:1140-1150`), so drag & drop is not a later
                commit — the nodes exist before the panel initializes or nothing does.
                0002's deferred gesture arrives *with* the panel
              - `<div id="op_up2k" class="act">` wrapping the panel — three call sites
                test `#op_up2k.act` and `up2k.js:3491` is the only thing that reaches
                `init_deps()`, the main-thread hasher fallback; `:3335` writes to it
                unguarded
              - `<div id="ops"><a data-dest="up2k">⬆</a></div>` and `<a id="repl">π</a>`
                at body level, both `display:none` from Card 5. `Donut` dereferences
                `QS('#ops a[data-dest="up2k"]')` with no guard (`up2k.js:638-640`) and
                stores its `textContent`, so the anchor needs one; `onresize` reads
                `getComputedStyle(ebi('ops'))['font-size']` (`:3064`), which resolves on
                a `display:none` element; `repl.offsetTop` is read at `:396` and `:1963`
              - `<div id="u2err">` inside the panel (`up2k.js:867-872`, unguarded)
done when:     suite green (31), no `.py` in the diff, no new file under `web/`, and in
               the console after `sheet("nu_upl", true)`: every id and selector in
               §"The contract, in one place" resolves (paste the two lists and filter
               for `null`); `ebi("op_up2k").classList.contains("act")` is `true`;
               `ebi("ops").querySelector('a[data-dest="up2k"]').textContent` is
               non-empty; `ebi("u2btn").parentNode.id === "u2btn_ct"` and
               `ebi("u2etaw").parentNode.id === "u2c3t"`; and `ebi("drops")` is a child
               of `<body>`, not of `#nu_upl`. At both viewports, with the sheet closed,
               the listing is unchanged from Card 1 and no stray box appears anywhere

### Card 3 — The shim, and the self-check that gates the mount
precondition:  Card 2 landed — the DOM the shim is checked against exists, and
               `mount_upl()` is the seam the check sits in front of
read for why:  spec §D3 Part 2 in full — it is a table of ten reaches, and `goto` and
               `apply_perms` are why the row is a boundary and not a seam; and the
               §D3 tripwire paragraph (why the check is runtime `nu.js` and not a test
               file). This plan's §"Three of the shim's ten symbols are inside a `try`"
model:         opus
commits:
  1. nu: add the browser.js shim up2k.js reaches through
     touches: copyparty/web/nu.js
     do:      - one banner-commented section installing the twelve names of
                §"The contract"'s last block on `window`, **before** anything is
                injected. `util.js:26`'s bare `var treectl, thegrid, up2k, …` does not
                reset an existing binding, so installing first is safe
              - **`goto` is an inert route guard.** `browser.js:1169-1204` resolves
                `QS('#ops>a[data-dest=…])` and dereferences it (`:1179`), toggles
                `#op_<dest>` (`:1192`), dispatches `window['goto_' + dest]` (`:1195`),
                writes `clmod(document.documentElement, 'op_open', dest)` (`:1200` — a
                class `nu.css` has no rule for) and calls `treectl.onscroll()`.
                Three of `up2k.js`'s five call sites fire unconditionally at init:
                `:862` for a read-less write-only user, `:3500`, and `:3504` replaying
                `sread('opmode')` from a previous **classic-UI** session. `nu`'s version
                dispatches `window['goto_' + dest]` when it exists (this is how
                `goto('up2k')` still reaches `goto_up2k` → `init_deps`) and otherwise
                does nothing at all — no navigation, no class on `<html>`
              - **`apply_perms` is replaced, not proxied.** `browser.js:8042-8158` is
                117 lines that write to `<html>` and `<body>` and dereference
                `#ops a[data-dest="up2k"]` (`:8058`), `#acc_info` (`:8091`), `#new_mdi`
                and `#u2rand`'s parent (`:8143`) unguarded. `nu`'s does exactly the two
                lines the uploader depends on — `u2ts = res.u2ts` (`:8145`) and
                `if (up2k) up2k.set_fsearch()` (`:8146-8147`) — or `fsearch` never
                initializes
              - `treectl = { onscroll: noop, goto: <nu's own re-fetch of the current
                listing> }`. `onscroll` is called at `up2k.js:57`, **top level**, before
                any page function has run; `goto` is inside the `try` at `:1872-1876`
                and is the call that makes a finished upload appear in `nu`'s list
              - `msel = { getsel: function () { return []; } }` and `mp = { au: null }`
                — both only read inside that same `try`, both kept so the guard passes
                and `treectl.goto()` is reached
              - `wintitle(txt, noname)` writes `document.title` **and** is the progress
                feed D2 asks for: it stores the string in `ST.upl` (`null` when called
                with no argument, which is what `Donut.on(false)` does at
                `up2k.js:690` when the queue drains). Card 5 renders from it
              - `fileman = { render: noop }` (`up2k.js:3496`, top level, guarded only by
                `if (ls0)`), `go2up2k`/`go2bup` as `goto('up2k')`/`goto('bup')`
                (`:879-880` binds them to the `u2yea`/`u2nah` anchors that arrive inside
                Card 1's `L` strings)
              - `ACtx` / `start_actx` / `actx` copied in shape from
                `browser.js:1275`, `:2760-2782`. **`actx` must be `null` or a real
                `AudioContext`, never a stub** — `up2k.js:735` guards on
                `uc.upsfx && actx && actx.state != 'suspended'` and then `sfx_nice()`
                calls `actx.createOscillator()` (`:751-762`), so a falsy value is safe
                and a fake object is a TypeError
  2. nu: add the contract self-check that gates the mount
     touches: copyparty/web/nu.js
     do:      - two literal arrays beside the shim — the required ids and non-id
                selectors of §"The contract", and the twelve symbol names — and one
                `check_upl()` that walks both and returns the **first** miss by name
              - it runs on the sheet's first open, **between `mount_upl()` and the
                injection**, so a contract miss is reported before a byte is fetched.
                On a miss it aborts the mount, writes the name into `#nu_uplb` and
                leaves the sheet showing it. It never throws
              - a comment stating the two things it structurally cannot check — what
                `up2k.js` creates for itself (`u2depmsg`, `actx_go`, `undor`, …) and the
                ids that only exist once an `L` string renders (`lifem`, `lifeh`,
                `lifew`, `u2nah`, `u2yea`) — and that `acc_info` is **not** on the list
                because `up2k.js:1646` is commented out
              - the id list is the **checked** set, not a grep of `ebi\('…'\)`: that
                grep returns 47, of which `acc_info` is dead and eleven are up2k's own
done when:     suite green (31), no `.py` in the diff, and the tripwire is proven by
               falsification: temporarily delete `u2etah` from Card 2's generated
               markup, open the sheet, and the sheet shows **`u2etah`** by name and does
               not mount; restore it and the sheet mounts. Same with a symbol —
               `delete window.wintitle` before opening names `wintitle`. In the console
               with the sheet mounted, `actx === null` is `true` (nothing has called
               `start_actx` yet) and `typeof goto === "function"`; and
               `localStorage.setItem("opmode", "player")` followed by a reload and an
               open leaves `location.href` unchanged and `<html>` with no `op_open`
               class

### Card 4 — The loader: the panel comes alive
precondition:  Cards 1-3 landed — the globals, the DOM and the shim are all in place,
               which is the whole precondition `up2k.js` has (loading it *is* calling
               it). **Also: `web/deps/sha512.hw.js` must exist** — run
               `./scripts/make-sfx.sh fast dl-wd` first; it is gitignored and absent
               from a fresh checkout, and `up2k.js:1498` builds every hash worker from
               that URL
read for why:  spec §D6 in full — it is two silent-failure mechanisms (the `Ls` clobber
               and the load-order constraint), each of which is a bug if missed, and it
               is the reason this card is alone in its session. Also §D3 Part 4 (the
               nonce and `ui.css`)
commits:
  1. nu: inject ui.css ahead of nu.css on first open
     touches: copyparty/web/nu.js, copyparty/web/nu.css
     do:      - `util.js` has no `import_css` (only `import_js`, `:442-456`), so this is
                `nu`'s own `<link rel="stylesheet">` — and it is inserted with
                **`document.head.insertBefore(link, document.head.firstChild)`, not
                `appendChild`**. Cascade order for author sheets follows the document
                order of their elements: appended, `ui.css:6`'s `:root { --fg: #ccc }`
                would outrank `nu.css:23`'s `--fg` and repaint every `nu` surface from
                the first open on. Inserted first, `nu.css` — and the admin's `{{ css }}`
                override after it — win every tie, while `ui.css`'s rules for `#tt`,
                `#toast`, `#toastb` and `#modal` (zero matches in `nu.css`) still apply.
                A comment says exactly this, because `appendChild` is what the next
                reader will reach for
              - two same-specificity rules in `nu.css` for what has no tie to win:
                `input, button, textarea, select { font-family: var(--font); }` against
                `ui.css:385-387`, and a `:focus` box-shadow of `nu`'s own against
                `ui.css:389-394`'s `#fc0` glow. Both **outside** `#nu_upl` — inside the
                panel, Card 5 decides
              - `ui.css` is 10 KB / 646 lines, not the 61 KB the spec quotes (that is
                `nu.css`'s size); the lazy budget is ~175 KB, not 230
  2. nu: set langmod, then inject util.js and up2k.js in order
     touches: copyparty/web/nu.js
     do:      - `window.langmod = window.langmod || function () {};` **before**
                `util.js`. `util.js:310-311` is
                `if (!window.Ls || !window.langmod) var Ls = {};` — `nu.html:257`
                declares `var Ls = {}` and the `tl` tag fills it, so `window.Ls` is
                truthy, but `window.langmod` is undefined, the condition holds, and the
                whole dictionary is reset to empty. `L` (`nu.js:229`) keeps its old
                reference and survives, but `t()`'s `Ls.eng[k]` fallback then throws on
                the first key a `tl` file does not carry — so the failure is invisible
                on `eng` and total on `--lang por`. The `|| ` is not defensive noise:
                `langmod` is the translator tooling's hook (`scripts/tl.js:12`,
                `scripts/tl.py:52`) delivered through the `--js` slot `nu.html:286`
                emits *after* `nu.js`, and a bare assignment would replace a real one
              - then `import_js` for `util.js`, and **on its `onload`** `import_js` for
                `up2k.js`. Not two calls in a row: `up2k.js` is `"use strict"` and dies
                at its own line 9 reading the bare `nosubtle` that only exists once
                `util.js:16-17` has sprayed `CGV1`. `import_js` stamps `JS_NONCE`
                itself (`util.js:446-447`) — that is Card 1 commit 1's whole point.
                The `ui.css` `<link>` needs its own `nonce` attribute set by hand
              - the sheet shows a loading state from the tap until `up2k` is non-null
                (`up2k.js:29` starts it at `null` and `up2k_init` resolves it
                asynchronously through `crypto.subtle.digest`, `:40-44`), then the
                panel. `check_upl()` from Card 3 runs before any of this
              - the injection is once per page life, behind the same mounted flag
  3. nu: wire the Upload files button to the sheet
     touches: copyparty/web/nu.js
     do:      - `ACTS[0]` (`nu.js:2486-2496`): `show()` gains
                `!!(perms && perms.indexOf("write") + 1)` — the **same** expression
                `mkdir` carries one row below (`:2499`) — `live()` returns `true`
                (joining `:2500`), and `do()` becomes `sheet("nu_upl", true)`
              - replace the comment: the dead-button shape of spec 0001 §D2 was for a
                thing *this UI* had not built; a thing the **server** refuses takes the
                `show()` path, which is the rule `SACTS`' delete row already states
                (`:2533-2536`)
done when:     suite green (31), no `.py` in the diff, and a live walk at 390×844 and
               1440×900 on a volume served with `-e2dsa`, after the deps recipe has put
               `web/deps/sha512.hw.js` in the tree:
               `Enviar arquivos` opens the sheet and the panel initializes;
               **upload one file** and it lands and appears in `nu`'s listing without a
               manual reload (the shim's `treectl.goto`);
               **upload seven** and cancel mid-queue;
               **drop a folder** on the desktop band and its tree is walked;
               **re-upload a file that is already there** and the handshake dedupes it
               instead of re-sending;
               the browser console shows **no CSP violation** and `u2notbtn` is not
               left showing a `loading sha512.*` modal;
               with the sheet open on a `--lang por` server the panel is Portuguese and
               **the rest of `nu` is still Portuguese after closing it** (this is the
               `Ls` clobber, and it shows up nowhere else);
               `getComputedStyle(document.documentElement).getPropertyValue("--fg")`
               is `nu`'s value, not `#ccc`, and `nu`'s search box and buttons look
               identical to Card 3;
               toggle `hashw`, reload, reopen — the toggle came back the way it was
               left (the `bcfg_get` failure of §D3 Part 3 is invisible except across a
               reload);
               and with a user lacking `write`, the button **does not render at all**

### Card 5 — The panel in nu's language, progress on a closed sheet, and the docs
precondition:  Card 4 landed — the panel initializes and uploads, so styling is being
               judged against the real thing and `ST.upl` is being fed by the shim's
               `wintitle`
read for why:  spec §D2's last paragraph (why progress rides the existing status line
               and not a new footer strip), §D3 Part 3's "hiding is a CSS act", and
               this plan's §"Which up2k switches `nu` shows"
commits:
  1. nu: style the upload panel and the drop overlay into nu's language
     touches: copyparty/web/nu.css
     do:      - a **re-derivation, not a copy**: `browser.css` carries 93 top-level rules matching
                this surface and its theme-scoped variants key on the classic UI's
                `html.<theme>` classes, while `nu` themes through custom properties and
                the `nu_thm` pref. Every colour comes from `nu`'s tokens
              - the disclosure pinned above: `#u2conf` and the twelve config controls
                are `display:none` until a class on `#nu_uplb` is toggled by one button
                labelled with Card 1's single new `nu_*` key. **Class, never a markup
                omission**
              - `display:none` at every width for `#ops`, `#repl` and `#ico1`;
                `#op_up2k` keeps its `act` class and gets no box of its own
              - `#drops` / `#up_dz` / `#srch_dz` are `position: fixed` full-window drop
                targets, inert (`pointer-events`/opacity) until `up2k.js` adds its
                classes — at **both** bands, since 0002's deferred desktop gesture
                arrives here
              - the panel scrolls inside the sheet; `#u2tabw` gets its own
                `overflow-y`, or a seven-file queue pushes the button off screen
  2. nu: put the queue's progress on the status line
     touches: copyparty/web/nu.js
     do:      - `draw()` (`nu.js:2369-2383`) caches `ST.shown = shown` before calling
                `render_stat(shown)` — one line, and it is what lets anything else
                repaint the line without re-filtering
              - the shim's `wintitle` (Card 3) sets `ST.upl` and calls
                `render_stat(ST.shown || [])`, throttled to once a second. It is fed by
                `Donut.do` (`up2k.js:697-728`), which `timer` runs while a queue is busy
                (`:1892`) and which formats `"{0}%, {1}, #{2}, "` at `:712-713`; on
                drain `Donut.on(false)` calls `wintitle()` with no argument (`:691`),
                which is how `ST.upl` returns to `null`
              - `render_stat` (`nu.js:1899`) gains a **first** branch, before the
                selection branch: when `ST.upl` is non-null `#nu_count` reads
                `<done>/<total> · <pct>%` and carries `role="button"` + `tabindex="0"`,
                and activating it reopens the sheet. The counts come from the
                `#u2cards` spans up2k already maintains (`act="done"` and `act="q"`),
                the percent from the `%` at the head of `ST.upl` — up2k's own numbers
                either way. A parse miss degrades to the label alone, never to `NaN`
              - the attributes come **off** again on the way out, the way the selection
                branch already removes its `aria-label` (`:1922`)
              - **no new footer strip.** One line of an existing surface already says
                it, and 0001 and 0002 spent two specs keeping this layout honest
  3. docs: record that nu uploads
     touches: docs/nu-ui.md
     do:      - `## what is NOT built yet` (`:289-297`) loses its whole first paragraph;
                upload is built
              - the `classic UI` reasons list (`:102-108`) stops naming upload "above
                all" and keeps only the surfaces still owed
              - `what the wide band still owes` (`:220-221`) loses drag & drop
              - add what a reader cannot infer: from the first open of the upload sheet
                on, `util.js` is on the page — so `nu` inherits the classic UI's crash
                overlay (`util.js:307`), and `esc`/`setck`/`humansize` are `util.js`'s
                for the rest of the session, which is why `nu`'s three are named
                `nu_esc` / `nu_setck` / `nu_hsz`
              - name the two follow-ups upload unlocks and does **not** take: the
                `unpost` and `rups` rows of the `⋯` router (`nu.js:2752-2760`)
done when:     suite green (31), no `.py` in the diff, no new file under `web/`, and a
               live walk at 390×844 and 1440×900: the panel reads as `nu` at both
               widths in light **and** dark, with the switches hidden until the
               disclosure is tapped and every one of them present in the DOM
               (`ebi("hashw")` etc. all resolve while hidden); a seven-file queue is
               scrollable inside the sheet without pushing the button off screen;
               **close the sheet mid-queue** and the status line reads `3/7 · 62%`, and
               tapping it reopens the sheet on the running queue; when the queue drains
               the line goes back to `<n> items · <size>` and loses its `role`; drag a
               folder onto the 1440×900 window and the drop overlay appears over the
               whole window; open the sheet, close it, and `nu`'s own listing, sort,
               filter, selection and status line all still behave; and
               `docs/nu-ui.md` no longer names upload under *what is NOT built yet*

## Verification (mirrors the spec's §Verification)

Run after Card 5, as the whole-plan check.

- **No server drift.** `git diff 7b928330..HEAD` touches no `.py` file and adds no file
  under `web/`; the only files modified are `copyparty/web/nu.{js,css,html}` and
  `docs/`. A new file under `web/` would also need a row in `RES`
  (`copyparty/__init__.py:65-143`) and a row in `scripts/sfx.ls` — the reason the shim
  is a section of `nu.js`.
- **The classic UI is untouched.** No file under `copyparty/web/` other than `nu.*`
  appears in the diff. `?nu0` still escapes, `?b` still reaches the basic browser, and
  the classic UI's own upload panel is byte-identical.
- **The tripwire is real.** Delete one required id from the generated markup and the
  sheet refuses to mount, naming that id on screen. This is D1's reopen condition: if it
  starts firing on upstream changes, the native uploader is back on the table with a
  measurement behind it.
- **No `undefined` anywhere.** On an English server every label, tooltip and column
  header of the panel is a real string; on `--lang por` no English survives in it. Both
  follow from Card 1's 142, and neither is protected by `t()`'s per-key fallback —
  `up2k.js` dereferences `L` directly.
- **The `Ls` clobber stays shut.** On a `--lang por` server, open the sheet, close it,
  and navigate two folders: the whole UI is still Portuguese. This is the one D6 failure
  that shows up only *after* the injection.
- **The collisions stay named.** `grep -n 'function humansize\|function esc(\|function setck' copyparty/web/nu.js`
  returns nothing; `nu_hsz`, `nu_esc` and `nu_setck` are the only definitions.
- **The cascade holds.** With the sheet open,
  `getComputedStyle(document.documentElement).getPropertyValue("--fg")` is `nu`'s token,
  and the `ui.css` `<link>` is `document.head.firstElementChild` — appended instead of
  inserted, this test is the only thing between a working `nu` and a grey one.
- **The uploader is the real one.** A file already on the server is deduped by the
  handshake rather than re-sent; a dropped folder is walked recursively; a dropped
  connection costs the current chunk and not the file. None of this is `nu` code — it is
  `handle_post_json` (`httpcli.py:3150`) and `handle_post_binary` (`:3331`) answering
  `exec_handshake` (`up2k.js:2518`), which is the whole of D1.
- **A stale classic session steers nothing.** With `opmode` in `localStorage` from a
  classic-UI visit, `nu` opens the sheet and navigates nowhere, and `<html>` never gains
  an `op_open` class.
- **`write` is a `show()`, not a dead `live()`.** A user without `write` gets no upload
  button at all — the rule `SACTS`' delete row already states (`nu.js:2533-2536`).
- **Suite:** `python3 -m unittest discover -s tests` green — 31 tests, as at
  `7b928330`. A regression guard, not evidence the work is right.

## Follow-ups this plan deliberately does not take

- **The `⋯` rows upload unlocks** — `Undo a recent upload` (`unpost`) and
  `Recent uploads` (`rups`), declared and disabled at `nu.js:2752-2760`. Each needs its
  own flow; `nu` gains an uploader here, not an upload history.
- **Remembering the queue across a reload** (spec §D5's third bullet). The server half
  works for free via the re-handshake; only the bookkeeping would be new. It earns its
  own spec once someone actually loses a queue.
- **Promoting the up2k switches into `nu_cfg`.** They live behind the panel's disclosure
  here. Giving `hashw`, `u2turbo` or `u2ts` a first-class row in `nu`'s own settings
  vocabulary is a separate piece of design.
- **A basic (`bput`) fallback** for browsers where the worker or `subtle` path fails.
  `up2k.js` already degrades through its own tiers; a fourth path is speculation until a
  real browser fails.
- **Extracting an `up2k-core.js` shared by both UIs.** Rejected by D1 for now, and this
  plan does nothing to make it harder: the shim is the measured surface, and the
  self-check is the instrument that would justify it.
