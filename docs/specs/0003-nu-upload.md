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
> target before the uploader exists would produce a target that swallows files"
> (`0002:467-469`). This spec answers the question and builds the answer.

- **Status:** planejado — spec + plano ([[plans/0003-nu-upload|0003]]); próximo passo é `/exec`.
- **Hardened:** 2026-08-25 against `3defa788`

Today `nu` renders `Enviar arquivos` as a visibly dead button that routes to `?nu0`:
`ACTS[0]` at `web/nu.js:2486-2496`, whose `live()` returns `false` on purpose so the
button is tappable and explains itself rather than hiding. Nothing else about upload
exists in `nu` — no input, no queue, no progress, no drop target. `web/nu.html` loads
`tl/<lang>.js` (`:282`) and `nu.js` (`:284`) and nothing else of the classic UI's
JavaScript, so neither `util.js` nor `up2k.js` is on the page. The plan
`/planc` writes will mirror this number at `docs/plans/0003-nu-upload.md`.

---

## The thesis

0001 framed the fork as **reuse `up2k.js` or reimplement it**, and priced reuse at "a
permanent ugly seam between two DOM worlds" and reimplementation at "rewriting the code
paths where a bug loses a user's file". Reading the actual tree moves both prices and
turns a two-way fork into a decided one — but it also raises the price of reuse above
what 0001 assumed, and this spec states that price rather than discovering it in
`/exec`.

- **The dangerous half of "reimplement" is already a standalone, reusable part.**
  `web/w.hash.js` (125 lines) is a self-contained worker with an explicit message
  contract — `postMessage([nchunk, fobj, car, cdr])` (`:56`) answers
  `["done", nchunk, hslice, len]` (`:103`), plus `["read"|"fail"|"ferr"|"panic"]`
  (`:68`, `:83`, `:85`, `:51`) and the two control messages `'nosubtle'` and `'ping'`
  (`:44`, `:47`). It resolves `crypto.subtle` → `hashwasm` on its own (`:19-33`,
  `:114-119`) and carries the expensive scars: the Chrome GC bug that forgets the
  `FileReader` output (`gc1/gc2/gc3`, `:63-65`), Win10-Defender's `NotReadableError`
  and macOS-Firefox's `NotFoundError` (`:80-81`).
- **But "reimplement" is much more than hashing plus a state machine.** `up2k.js`
  already ships recursive directory traversal for dropped folders (`webkitGetAsEntry`
  `:1233` → `createReader` `:1307` → `readEntries` `:1309`), a `webkitdirectory` input
  (`:1598`), and the whole drop-target wiring (`:1040-1150`). Those are ~250 lines of
  browser edge cases already paid for. Rewriting them buys nothing but a second place
  for the same bugs to live.
- **And "reuse" does not require hiding anything.** The classic UI's upload markup is
  **not static**: `browser.html:69` holds a bare `<div id="op_up2k" class="opview">
  </div>`, and `browser.js:868-947` fills it with 80 generated lines. The element ids
  `up2k.js` drives are therefore ids *it asks someone to create*, not ids welded to the
  classic page. `nu` can create them itself, in its own sheet, in the open.
- **But `up2k.js` is not a library, and it is not inert either.** It is the tail of a
  *page*. Its top-level module code runs the moment the script tag executes: it calls
  `up2k_init` itself (`:43`, `:50`), then `treectl.onscroll()` (`:57`), then at the
  bottom `tt.init()`, `favico.init()`, `ebi('ico1').onclick = …` (`:3480-3488`),
  `QS('#op_up2k.act') && goto_up2k()` (`:3491-3492`), `apply_perms({perms, frand,
  u2ts})` (`:3494`), `fileman.render()` (`:3496`) and `goto()` / `goto(sread('opmode'))`
  (`:3499-3507`). There is no "load it and call it later": loading it **is** calling it.
  Everything it needs — the DOM, the shim, the globals — must already be there.

So the seam 0001 feared — mirroring a hidden DOM into a second UI — is avoidable, and
the rewrite it feared is both unnecessary and larger than advertised. The decision below
takes the third door: **`nu` hosts the real up2k panel as a tenant of the sheet
machinery it already owns.** Zero `.py` diff, zero lines changed in the classic UI, and
the entire chosen scope (drag & drop, whole-folder, dedup, resume) arrives already
proven in production. The price is an *init contract* — D3 measures it exactly.

## The decisions

### D1 — Host the real up2k; do not mirror it, do not rewrite it

`nu` builds the container `up2k.js` expects, inside its own sheet, satisfies its init
contract (D3), and lets it initialize itself (`up2k_init`, `up2k.js:806`, called from
`:43`/`:50`). The panel is **visible**, styled by `nu.css`. The state that drives it is
up2k's own and is on screen — there is no second model of the queue anywhere in `nu`.

The rejected alternatives, and why:

- **Hidden container + a `nu`-drawn mirror.** Buys a 100% `nu` visual at the cost of
  synchronizing two models of the same queue forever, and of breaking silently when the
  classic UI changes a class or an id. The mirror is the seam; hosting removes it.
- **A native `nu` uploader over `deps/sha512.hw.js`.** Defensible, and the honest cost
  of D3's contract narrows the gap — but it does not close it. A native uploader still
  costs the handshake/chunk/re-handshake state machine *plus* `readEntries` recursion,
  `webkitdirectory`, the drop wiring, and a third copy of `get_chunksize`
  (`up2k.js:2104` is already a line-for-line twin of `up2k_chunksize`,
  `up2k.py:5706-5715`). What it buys — no dependency on the classic UI — is bought more
  cheaply by D3's shim and its tripwire.
- **Extracting an `up2k-core.js` shared by both UIs.** Cleanest on paper, but it
  refactors code that has worked for years and puts the risk on the classic UI to save
  code `nu` would otherwise write once. `w.hash.js` is the proof that the part worth
  extracting **was already extracted**; what remains in `up2k.js` is interleaved with
  `U2pvis`, `Donut` and the `u2cards` renderer.

**The reopen condition is D3's tripwire, not a feeling.** If the contract check starts
firing on classic-UI changes, the native uploader is back on the table with a real
measurement behind it.

### D2 — The panel is the fifth sheet tenant, not a new component

`nu`'s sheet machinery is already multi-tenant: one veil, at most one open sheet, N
tenants, each an element id plus an optional renderer (`web/nu.js:2403-2417`, `sheet()`
at `:2419`). `SHEETS` currently registers four — `nu_sheet` (sort), `nu_menu` (the `⋯`
router), `nu_cfg` (settings), `nu_tsh` (the tree). Upload registers as the fifth,
`nu_upl`. It inherits the veil, the transition, the Escape handling and the "opening one
closes the other" rule for free, and nothing above it learns that a fifth exists.

The sheet **element** is static markup in `nu.html`, like its four siblings
(`nu.html:108`, `:123`, `:142`, `:165`) — `sheet()` does `ebi(id)` and silently returns
if the node is missing (`nu.js:2420-2422`), so a renderer-only tenant does not exist in
this machinery. `nu_upl` is therefore a `<section id="nu_upl" hidden>` in `nu.html`
whose inner container `nu.js` fills.

The `Enviar arquivos` button stops being dead by two edits to `ACTS[0]`
(`nu.js:2486-2496`). The table shape is `[key, label, aria-label, show(), live(), do()]`
(`nu.js:2477`), and the two questions are **not** interchangeable — `nu.js:2479-2483`
says so, and the `SACTS` delete row proves it (`nu.js:2533-2536`: a thing the *server*
refuses is not rendered at all, not rendered dead):

- `show()` gains the `perms.indexOf("write")` test that `mkdir` already carries in the
  **same column**, one row below (`nu.js:2499`). A user without `write` gets no button,
  exactly as they get no `mkdir`.
- `live()` returns `true`, joining `mkdir`'s `live()` at `:2500`.
- `do()` opens the sheet instead of navigating to `?nu0`.

The dead-button shape 0001 §D2 built was for a thing *this UI* had not built yet; once
it is built, the write permission is a server refusal and takes the `show()` path.

**Progress when the sheet is closed** rides the status line that already exists
(`render_stat`, `nu.js:1899`), which today shows counts and the sort criterion, and
which selection mode already relabels rather than duplicating (`:1902-1917`). It gains
one more state: `3/7 · 62%` while a queue is running, tapping it reopens the sheet. A
persistent footer strip was considered and dropped — it would add a permanent box to a
layout that 0001 and 0002 spent two specs keeping honest, to show what one line of an
existing surface can already say.

### D3 — The boundary is an init contract in four parts, and it is measurable

`up2k.js` is not standalone. Everything it reaches for is countable, and this spec
counted it. The contract has four parts, and **all four must hold at the instant the
`up2k.js` tag executes** (see the thesis: loading it is calling it).

**Part 1 — the bare globals, which arrive by a spray `nu` does not perform.**
`util.js:16-20` does `Object.assign(window, window.CGV1)` and
`Object.assign(window, window.CGV)`. That is the only reason `nosubtle`, `frand`,
`u2ts`, `u2sz`, `u2ow`, `u2j`, `lifetime`, `turbolvl`, `u2sort` and `have_up2k_idx`
exist as bare globals on the classic page — they are keys of `js_htm`
(`authsrv.py:3285-3345`; `turbolvl` `:3328`, `nosubtle` `:3329`, `u2j` `:3330`,
`u2sz` `:3331`, `u2ts` `:3332`, `u2ow` `:3333`, `frand` `:3334`, `lifetime` `:3335`,
`u2sort` `:3336`). `nu.html` binds that same object to the name **`srvcfg`**
(`nu.html:266`), not `CGV1`, and hand-picks `perms`, `acct` and `ls0` out of `cgv`
(`:271-275`). So the spray does nothing on `nu`'s page.

`up2k.js` is `"use strict"` (`:1`), so an unresolved bare read is a `ReferenceError`,
not `undefined`. It therefore dies at **`up2k.js:9`** — the IIFE at `:5-14` reads
`nosubtle` with no `try` around it, before a single function is defined. Guarding that
one only moves the crash to `up2k_init`: `icfg_get('nthread', u2j)` at `:895`,
`icfg_get('u2sz', u2sz_tgt)` at `:896`, `u2ts.endsWith('u')` at `:906`.

The fix is one line of `nu.html`, not a shim: declare `CGV1 = {{ cgv1 }}` and
`CGV = {{ cgv|tojson }}` beside the existing names, and let `util.js` spray as it does
for the classic UI. Keep `srvcfg` — `nu.js` reads it throughout and it is the same
object. `window.up_site` and `window.u2hashers` need nothing: `up2k.js` always reads
those `window.`-qualified (`:1563`, `:1608`, `:2596`, `:2630`, `:1491`).

**Part 2 — the `browser.js` surface. Ten symbols, and two of them are not one-liners.**
Every reach, measured:

| Symbol | Where `up2k.js` calls it | What it wants | Where it really lives |
|---|---|---|---|
| `treectl.onscroll` / `treectl.goto` | `:57` (**top level**), `:1874` | re-list the folder after an upload lands | `browser.js` |
| `fileman.render` | `:3496` (**top level**) | redraw the file list | `browser.js:3937` |
| `msel.getsel` | `:1873` | "is anything selected" before auto-refreshing | `browser.js` |
| `mp.au` | `:1873` | "is the music player playing" before auto-refreshing | `browser.js` |
| `wintitle` | `:691`, `:712`, `:745` | write progress into `document.title` | `browser.js:9636` |
| `go2up2k` / `go2bup` | `:879-880` | the two buttons of the https-warning modal | `browser.js:1205-1206` — both are `goto()` wrappers |
| `start_actx` / `actx` / `ACtx` | 11 `start_actx()` calls, `:1024`..`:3433`, plus 6 direct `actx` reads, `:735`..`:1582` | the `AudioContext` keep-alive hack | `browser.js:2760-2782` (23 lines) and `ACtx` at `:1275` |
| **`goto`** | `:19`, `:863`, `:1201`, `:3500`, `:3504` | the classic UI's opview tab router | `browser.js:1169-1204` (36 lines) |
| **`apply_perms`** | `:3494` (**top level**) | far more than `{perms, frand, u2ts}` | `browser.js:8042-8158` (117 lines) |

The last two are the reason this row is a *boundary* and not a seam.

**`goto` is not a name, it is the classic tab system.** `browser.js:1179` resolves
`QS('#ops>a[data-dest=' + dest + ']')` and dereferences it, `:1192` toggles
`ebi('op_' + dest)`, `:1195` dispatches `window['goto_' + dest]`, `:1200` writes
`clmod(document.documentElement, 'op_open', dest)` — a class onto `<html>` that `nu.css`
has no rule for — and `:1202-1203` calls `treectl.onscroll()`. Three of the five call
sites fire **unconditionally at init**: `up2k.js:863` for a read-less write-only user,
`:3500`, and `:3504` replaying `sread('opmode')` from a previous *classic-UI* session.
On `nu`'s page `goto` is an inert route guard; letting it through means a stale
`localStorage` key steers the new UI toward a tab that does not exist.

**`apply_perms` is 117 lines that write to `<html>` and `<body>`.** Besides the three
fields the call passes, it does `QS('#ops a[data-dest="up2k"]').removeAttribute(…)`
(`:8058-8060`, unguarded), `tt.att(QS('#ops'))` (`:8070`),
`ebi('acc_info').innerHTML` (`:8091`), `goto()` (`:8119`),
`document.body.setAttribute('perms', …)` (`:8121`), the
`read`/`write`/`nread`/`nwrite` classes on `<html>` (`:8132-8135`), a `QSA('#u2conf td')`
display loop (`:8137-8140`) and `ebi('u2rand').parentNode.style.display` (`:8143`,
unguarded). `nu`'s version **replaces** it rather than proxying it — but it must still
do the two lines the uploader depends on: `u2ts = res.u2ts` (`:8145`) and
`up2k.set_fsearch()` (`:8146-8147`), or `fsearch` never initializes.

Two smaller shapes ride the same table. `Donut()`, which `up2k_init` constructs, does
`optab = QS('#ops a[data-dest="up2k"]')` at `up2k.js:638` and dereferences it at `:640`
with no guard — so the `#ops` tab-bar anchor is part of the contract even though it is
not an id. And `actx` must be either the real `AudioContext` or **`null`** — never a
stub object: `up2k.js:735` guards on `uc.upsfx && actx && actx.state != 'suspended'`
before `sfx_nice()` (`:751-762`) calls `actx.createOscillator()`, so a falsy `actx` is
safe and a fake one is a TypeError.

**Part 3 — the DOM. It spans six sources, not one.** `up2k.js` reaches **50 distinct
ids** through `ebi`/`QS`. The `browser.js:868-947` block supplies **26** of them, and
drives 5 more without a literal id in sight: `multitask` and `u2rand` through
`bcfg_bind` (`up2k.js:901-902`), and `u2btn_ct` / `u2btn_cw` / `u2c3t` through the
**computed** `ebi(wide ? 'u2btn_cw' : 'u2btn_ct')` and
`ebi(wide == 'ww' ? 'u2c3w' : 'u2c3t')` at `up2k.js:3069` and `:3078` — invisible to a
grep for `ebi('…')`, and a trap for any check that builds its list that way. The other
24, and where they really live:

| Source | ids | Required? |
|---|---|---|
| `browser.js:868-947` (the up2k panel) | `u2conf`, `u2cards`, `u2tab`, `u2tabw`, `u2btn`, `u2bm`, `u2foot`, `u2form`, `u2mu`, `u2life`, `u2etah/s/t/u/w`, `u2c3w`, `nthread`, `nthread_add/sub`, `potato`, `fsearch`, `u2ow`, `u2notbtn`, `u2flagblock`, `luplinks`, `cuplinks` (26 + 5 driven indirectly) | yes |
| `browser.js:960-971` (the drop overlay) | `drops`, `up_dz`, `srch_dz`, `up_zd`, `srch_zd` | **yes — unguarded** at `up2k.js:1143-1150` |
| `browser.js:1035-1060` (the config panel, unguarded reads) | `u2szg` (`:1045`), `ico1` (`:1054`) | **yes — unguarded** at `up2k.js:896` and `:3482` |
| `browser.js:1038-1049` (the config panel's toggles) | `ask_up`, `u2ts`, `umod`, `hashw`, `nosubtle`, `u2turbo`, `u2tdate`, `flag_en`, `u2sort`, `upnag`, `upsfx` | **yes, as nodes** — see below: omitting one silently discards the user's saved preference |
| `browser.html` | `u2err` (`:33`), `op_up2k` (`:69`), `repl` (`:127`), `ops` (`:19`) | `u2err` and `op_up2k` yes — `ebi('u2err')` at `up2k.js:867-872` and `clmod(ebi('op_up2k'), …)` at `:3335` are unguarded; `repl` is read at `:396` and `:1963`, `ops` at `:3064` |
| carried inside the `L` strings themselves | `lifem`/`lifeh` (`browser.js:642`), `lifew` (`:643`), `u2nah` (`:583`), `u2yea` (`:594`) | yes — they ride D4's slice, not any markup commit |
| created by `up2k.js` itself | `u2depmsg` (`:854`), `actx_go` (`:1585`), `u2depotato`/`u2enpotato` (`:441-442`), `undor` (`:3222`), `nagtest` (`:3430`), `lifes` | n/a |

Two consequences the id count alone does not carry.

**The drop overlay is not optional.** `ebi('up_dz')`, `ebi('srch_dz')` and `ebi('drops')`
are dereferenced without a guard at the top level of `up2k_init` (`up2k.js:1143-1150`),
so drag & drop cannot be a later commit — the nodes must exist before the panel
initializes at all. 0002's deferred gesture arrives *with* the panel, not after it.

**Hiding a switch is a CSS act, never a markup omission.** `bcfg_bind` tolerates a
missing element (`util.js:1353`), but `bcfg_get` returns `defval` **without reading
storage** when the node is absent (`util.js:1314-1317`). So dropping `#hashw` or
`#u2turbo` from the markup does not "hide a setting" — it throws away the value the user
saved, on every load, in silence. Every id in the table above is rendered; what a phone
does not need is hidden with `display:none` in `nu.css`.

**Part 4 — the page furniture `nu.html` does not ship.** Two of `browser.html`'s lines
are load-bearing for `up2k.js` and have no counterpart on `nu`:

- **`JS_NONCE`.** `browser.html:139` declares it; `nu.html:252-276` does not. The default
  `--csp-ui` is `script-src 'unsafe-eval' 'nonce-{{ js_nonce }}'; worker-src 'self'`
  (`__main__.py:1706`), and `import_js` stamps the nonce only `if (window.JS_NONCE)`
  (`util.js:446-447`). Without it, `init_deps`'s `import_js(SR + '/.cpr/w/deps/' + fn)`
  (`up2k.js:846`) is blocked by CSP, and the failure is a **hung modal**: `showmodal` runs
  at `:845`, `unmodal` only on `onload`. `worker-src 'self'` means the hash workers of
  `:1498` are fine — it is the main-thread dep import that dies. D6's own injection needs
  the same nonce.
- **`ui.css`.** `browser.html:10` loads it; `nu.html:9` loads only `nu.css`. `#tt`
  (`ui.css:30`, `:44`), `#toast` (`:53`), `#toastb` (`:108`) and `#modal` (`:260`) are
  defined there and **nowhere in `nu.css`** — zero matches. `up2k.js:3480` calls
  `tt.init()`, `:54` calls `toast.err()` on init failure, and `showmodal`/`unmodal`
  (`:819-833`) drive `#modal`. Without `ui.css`, every error path `up2k.js` has renders as
  unpositioned, unstyled DOM — which is the one path that must be legible.

Both are `nu.html` lines, not server logic. Declaring `JS_NONCE` is unconditional;
`ui.css` (646 lines) rides the same lazy path as the scripts in D6, injected as a
`<link>` on first open so a listing that never uploads never fetches it.

**The tripwire — and it is not a test file, because this repo has no JS harness.**
`tests/` is Python-only, CI runs `python -m unittest discover -s tests` plus
`scripts/test/smoketest.py` (`.github/workflows/ci.yml`), and there is no
`package.json`, no jest, no headless browser. A `.py` test would also break the "no
`.py` in the diff" bar that 0001 and 0002 both cleared (0002's whole range touched only
`nu.css`, `nu.html`, `nu.js` and `docs/nu-ui.md`). So the boundary check ships **inside
`nu.js`**, as a self-check that runs on the sheet's first open, between the mount and
the injection. It asserts the two halves `nu` itself owes: every id in Part 3's
required set is in the DOM, and every symbol in Part 2's table is defined on `window`.
On any miss it aborts the mount and names the missing id or symbol instead of letting
the panel half-boot. It cannot check what `up2k.js` creates for itself, and it cannot
check the ids that only appear once D4's strings render — those are covered by the live
walk. A silent break becomes a loud one at the moment that matters, with no harness to
invent and no `.py` to add.

### D4 — `L` needs an English baseline: exactly 98 keys, of which `nu` has zero

`up2k.js` reads **98 distinct `L.<key>` strings directly**, never through a `t()`
accessor. `nu` defines `var L = Ls[lang] || null` and `t(k) → (L && L[k]) || Ls.eng[k]
|| k` (`nu.js:229-233`), where `nu`'s `Ls.eng` (`nu.js:46`) is `nu`'s own dictionary of
`nu_*` and reused-by-key strings. The classic UI's `L` comes from `browser.js:716`
(`Ls[lang] || Ls.eng`), and its English baseline lives inside `browser.js`, which `nu`
does not load.

Measured against the tree:

- all 22 files in `web/tl/` carry **98/98** of the keys, so every translated install is
  already covered by the `tl/<lang>.js` tag `nu.html:282` already emits;
- `nu`'s `Ls.eng` carries **0/98**, so an English server — the `--lang` default, and the
  one language with no `tl` file at all — would render the string `undefined` into every
  label of the panel.

The decision: **bring the baseline, do not bypass it.** `nu` ships the up2k slice of
`Ls.eng` alongside its own. Note precisely what this buys and what it does not: because
`up2k.js` dereferences `L` and not `t()`, `nu`'s per-key fallback (`f3ca08f9`) does
**not** protect it — the protection is that `L` itself resolves to a table that carries
the keys, which is true for all 22 tl files today and becomes true for English with this
slice. If a future key is added to `up2k.js` and not to a tl file, that language shows
`undefined` for it, exactly as the classic UI does; that is upstream's accepted
behavior, not a `nu` regression.

The slice is a copy, not a paraphrase: five of these strings **are markup**, and the ids
inside them are part of D3's DOM contract, not decoration:

| Key | The id it carries | Who dereferences it |
|---|---|---|
| `u_life_cfg` (`browser.js:642`) | `<input id="lifem">`, `<input id="lifeh">` | `up2k.js:3222` writes the block, then reads both back |
| `u_life_est` (`browser.js:643`) | `<span id="lifew">` | `up2k.js:3281` writes the deletion time into it |
| `u_ancient` (`browser.js:583`) | `<a id="u2nah">` | `up2k.js:880` binds it to `go2bup` |
| `u_su2k` (`browser.js:594`) | `<a id="u2yea">` | `up2k.js:879` binds it to `go2up2k` |

A "cleaned up" translation of any of those silently breaks the thing it names, and no
markup commit can supply the ids — they only exist once the string is rendered. This is
why D3 Part 3 lists `lifew` as arriving through this dictionary.

Patching `up2k.js` to call `t()` instead of `L` is rejected: it edits the classic UI,
which D1 spends its whole budget avoiding.

### D5 — Resume is the protocol's, and the queue does not survive a reload

The scope asked for "resume between sessions". Half of it is free and half of it is
impossible, and the spec says which is which rather than promising both:

- **Free:** resume within the transfer. The re-handshake returns exactly the chunks the
  server is still missing (`httpcli.py:3150` `handle_post_json` for the handshake,
  `:3331` `handle_post_binary` for the chunk POST, which reads `x-up2k-hash` /
  `x-up2k-wark` at `:3341-3342` — the headers `up2k.js:3035-3036` sets). A dropped
  connection costs the current chunk, not the file. Nothing in `nu` implements this; it
  is the protocol.
- **Impossible as asked:** a queue that survives closing the tab. A `File` obtained from
  an `<input>` or a drop cannot be reopened after a reload — the browser requires a new
  user gesture. This is why the classic UI does not do it either: it warns instead
  (`beforeunload` → `warn_uploader_busy`, `up2k.js:1883`, defined `:3473`). `nu`
  inherits that warning.
- **What is actually deliverable, and is out of scope here:** remembering the *list*
  (names, sizes, warks) so that reselecting the same files skips what already landed.
  The server-side half of that already works for free via the re-handshake; only the
  bookkeeping would be new. Deferred, not rejected — see Out of scope.

`localStorage` therefore holds no queue in this spec. It holds what it already holds for
up2k: preferences — `u2ow` (`up2k.js:918`), `nthread` (`:3139`), `u2sz` (`:3169`), plus
the `bcfg` toggles of D3 Part 3's fourth row. None of those keys collide with `nu`'s
(`nu_*`, `grid3x`, `gridcrop`, `thumbs`, `dotfiles`, `nsort`, `dir1st`), so the two UIs'
preference stores coexist untouched.

### D6 — `up2k.js` is injected on first open, and `util.js` is what forces the order

This is the decision the payload question was hiding. Script order is not a preference
here; two mechanisms in the tree constrain it, and getting either wrong fails silently.

- **`util.js` clobbers `Ls` if it loads after `tl/<lang>.js`.** `util.js:310-311` reads
  `if (!window.Ls || !window.langmod) var Ls = {};`. `nu.html:257` already declares
  `var Ls = {}` and the `tl` tag at `:282` fills it, so `window.Ls` is truthy — but
  `window.langmod` is undefined, the condition holds, and `util.js` resets the
  dictionary to empty. Every translation *and* `nu`'s own `Ls.eng` are gone, and `t()`'s
  `Ls.eng[k]` fallback throws on the next call. `browser.js:713-714` and
  `splash.js:20-21` show the intended escape hatch: define `window.langmod` first and
  `util.js` stands down.
- **`up2k.js` must load after `nu.js`, because it initializes on load** (the thesis).
  Its DOM, its shim and its globals have to be in place first, and `nu.js` is what puts
  them there.

The decision: **`nu` injects `ui.css`, then `util.js`, then `up2k.js` on the first open
of the `nu_upl` sheet**, after mounting the markup and installing the shim, and sets
`window.langmod = window.langmod || function () {};` before injecting `util.js`. The
`|| ` is not defensive noise: `langmod` is the translator tooling's own hook
(`scripts/tl.js:12`, `scripts/tl.py:52`), delivered through the `--js` slot that
`nu.html:286` emits *after* `nu.js` — a bare assignment would silently replace a real
`langmod` with a no-op and break translating against `nu`. Every injected `<script>`
carries `nonce="{{ js_nonce }}"`, for the reason D3 Part 4 gives. The sheet shows a
loading state until the three files are in and the panel has initialized; D3's
self-check runs between the mount and the injection, so a contract miss is reported
before a byte is fetched.

This answers the payload question by construction rather than by measurement: the
+230 KB unminified (`util.js` 60 KB + `up2k.js` 109 KB + `ui.css` 61 KB, against
`nu.js`'s 157 KB and `nu.css`'s 61 KB) is paid by the users who upload, not by every
page view. The wire cost is smaller than those figures — `make-sfx.sh` gzips the shipped
resources — but the argument does not depend on the number: eager tags in `nu.html`
would additionally run `up2k.js`'s whole init on every listing, including the `goto()`
calls of Part 2, and would have to sit between `nu.html:276` and `:282` to dodge the
`Ls` clobber, a constraint no reader would infer from tag order.

Two consequences to carry into the plan. `util.js` installs `window.onerror = vis_exh`
at import (`util.js:307`) — from the first open on, `nu` inherits the classic UI's crash
overlay, a behavior change `nu.js:29` deliberately avoided until now. And `nu.js` and
`util.js` collide on four top-level names: `ebi` (identical binding), `esc`
(equivalent), `setck` (equivalent), and **`humansize`, which is not** —
`util.js:humansize(b, tersity)` formats through `HSZ_U` and honors a terseness argument,
while `nu.js:humansize(n)` takes one argument and honors `nu`'s `nu_szfmt` preference.
`up2k.js` calls it *with* the second argument at `:1666`, `:1677` and `:1742`, and
whichever file loaded last wins for every caller. `nu` must rename its own helper so the
panel's sizes and ETA render as up2k means them to.

## What is genuinely new, versus what is merely reused

**New — the whole of it:**

- `CGV1`, `CGV` and `JS_NONCE` in `nu.html`'s bootstrap block, so `util.js`'s spray
  works and injected scripts survive the CSP (D3 Parts 1 and 4);
- the sheet tenant: a `<section id="nu_upl" hidden>` in `nu.html`, the generated markup
  for the DOM blocks of D3 Part 3, and its registration in `SHEETS`
  (`nu.js:2412-2417`);
- the shim of D3 Part 2 — ten symbols, with `goto` as an inert route guard and a
  `nu`-native `apply_perms` that still does `u2ts = res.u2ts` and `set_fsearch()`;
- the D3 self-check that walks the id and symbol lists on first open;
- the loader of D6: `window.langmod`, the nonce-stamped ordered injection of `ui.css`,
  `util.js` and `up2k.js`, and the loading state;
- the up2k slice of `Ls.eng` — 98 keys (D4);
- two edits to `ACTS[0]` (`nu.js:2486-2496`): `show()` and `do()`;
- one new state in `render_stat` (`nu.js:1899`);
- a rename of `nu.js`'s `humansize` out of `util.js`'s way (D6);
- the `nu.css` rules that style the panel into `nu`'s visual language — a
  re-derivation, not a copy: `browser.css` carries 131 lines matching this surface, and
  its theme-scoped variants key on the classic UI's `html.<theme>` classes while `nu`
  themes through custom properties and the `nu_thm` pref.

**Reused, not rebuilt — named so this spec cannot be read as a rewrite:**

- chunked hashing with its three-tier fallback and workers — `web/w.hash.js` +
  `deps/sha512.hw.js`, instantiated at `up2k.js:1498` and pre-fetched at `:816`;
- the handshake / chunk / re-handshake state machine — `exec_handshake` (`:2518`),
  `exec_upload` (`:2876`), `exec_head` (`:2456`), `exec_hash` (`:2120`);
- `get_chunksize` (`:2104`), the client twin of `up2k_chunksize` (`up2k.py:5706-5715`);
- drag & drop and recursive folder traversal (`:1040-1150`, `:1233-1312`) and the
  `webkitdirectory` input (`:1598`) — this is how 0002's deferred drop target and the
  whole-folder scope arrive at once;
- dedup, the `u2ts` / `lifetime` / `frand` volume options, and the busy-tab warning;
- `nu`'s own sheet machinery, `perms` gate, status line and i18n fallback, all from
  0001/0002.

## What the server must provide

**Nothing. Zero `.py` diff.** Both upload paths already exist and are first-class:
`handle_post_json` for the handshake (`httpcli.py:3150`), `handle_post_binary` for the
chunk POST (`:3331`), and the multipart `act=bput` basic upload (`handle_plain_upload`,
`:3881`, dispatched at `:3094`/`:3108`) which this spec does not use. The permission
gate is `write`, already delivered to the page (`nu.html:271`) and already tested by
`mkdir` (`nu.js:2499`). `util.js`, `up2k.js` and `ui.css` are already shipped assets
(`copyparty/__init__.py`) served under `/.cpr/w/`, `httpcli.py` picks the `nu` template
with no per-asset logic, and `scripts/make-sfx.sh` globs by extension and never names
`nu.*` or `up2k.js` — so injecting them adds no route and no packaging change. `nu`
continues its record of adding no server logic.

The non-`.py` changes are **four**, all inside `nu.html`: `+CGV1`, `+CGV`, `+JS_NONCE`
(D3 Parts 1 and 4) and the `<section id="nu_upl">` container (D2). The scripts and
`ui.css` arrive by injection, not by a tag.

One packaging fact that is not a change but is a prerequisite for testing:
`copyparty/web/deps/` is **gitignored** (`.gitignore:30`), so `sha512.hw.js` is not in
this tree — the directory carries only `sha512.ac.js.gz` and `busy.mp3.gz`. It is built
by `scripts/deps-docker/Dockerfile:84-86` and folded together with `w.hash.js` by
`scripts/make-sfx.sh:605-611`. `up2k.js:1481-1498` creates the hash workers from that URL
unconditionally whenever `WebAssembly` is present, and `init_deps` imports it into the
main thread (`:846`). A live walk therefore has to run after
`make -C scripts/deps-docker` or `./scripts/make-sfx.sh fast dl-wd`, not against a bare
`python -m copyparty` on this checkout — and that is the only way to prove D1's central
claim.

## Out of scope (named, deferred)

- **A `nu`-native uploader.** D1 rejects it *for now*, on the evidence of the tree as it
  stands. D3's self-check is the tripwire that reopens it.
- **Remembering the queue across a reload** (D5's third bullet). Deliverable, but it is
  bookkeeping over a protocol feature that already works, and it earns its own spec once
  someone actually loses a queue.
- **The `⋯` rows upload unlocks.** `Undo a recent upload` (`unpost`) and
  `Recent uploads` (`rups`) are already declared and disabled in the router
  (`nu.js:2752-2754` and `:2758-2760`; their strings at `:146-148`); with upload alive
  they become answerable, but each needs its own small flow. `nu` gains an uploader here,
  not an upload history.
- **Promoting the up2k switches into `nu`'s own settings sheet.** The eleven
  config-panel toggles live inside the upload panel here, styled or hidden as an open
  question decides. Giving `hashw`, `u2turbo` or `u2ts` a first-class row in `nu_cfg`, in
  `nu`'s own vocabulary, is a separate piece of design.
- **Shares, the control panel, the media player, rename and move.** Unchanged by this
  spec, still parked by 0001 §D1 and `docs/nu-ui.md:299-315`.
- **Basic (`bput`) upload as a fallback** for browsers where the worker or `subtle`
  path fails. `up2k.js` already degrades through its own tiers; adding a fourth path is
  speculation until a real browser fails.

## Open questions

- **Which of the up2k switches `nu` shows.** The markup carries vocabulary that is the
  classic UI's (`multitask` 🏃, `potato` 🥔, `nthread`, `fsearch`, and the eleven
  config-panel toggles). Showing them preserves parity; hiding them narrows the panel to
  what a phone needs. Pin it when the panel is first styled, against the real thing. The
  *mechanism* is already decided and is not part of this question: every node is
  rendered, and hiding is `display:none` — omitting a node discards the user's saved
  value (D3 Part 3).
- **Whether the shim and loader should be a file or a section of `nu.js`.** A
  `nu-up2k.js` makes the boundary of D3 physically visible and gives the self-check a
  home; a section of `nu.js` keeps `nu` one file, as it is today. Weigh it once the shim,
  the self-check and the injected loader are written and their real size is known.
- **Whether `nu` should keep the crash overlay `util.js` installs** (D6) or restore its
  own `window.onerror` after the injection. Both are one line; the question is whether a
  `nu` user should ever see the classic UI's crash box.

## Commit sketch (NOT session cards — `/planc` expands these)

The order below is a dependency order, not a narrative one. `up2k.js` cannot be loaded
before the DOM, the shim and the globals exist (the thesis), so there is no first commit
that "loads it and asserts nothing calls it" — its arrival is step 5 and it arrives
working.

1. Declare `CGV1`, `CGV` and `JS_NONCE` in `nu.html`'s bootstrap block beside `srvcfg`,
   and rename `nu.js`'s `humansize` out of `util.js`'s way; assert `nu` still boots green
   and the status line's sizes are unchanged (D3 Parts 1 and 4, D6).
2. Add the 98-key up2k slice of `Ls.eng` to `nu.js`, markup and ids intact; assert every
   key `up2k.js` dereferences resolves on an English server (D4).
3. Add `<section id="nu_upl" hidden>` to `nu.html`, register `nu_upl` as the fifth tenant
   of `SHEETS`, and generate the required DOM of D3 Part 3 into it — the up2k panel, the
   drop overlay, `u2szg` + `ico1` + the eleven toggles, `u2err`, and the `#ops` anchor
   `Donut` dereferences (D2, D3 Part 3).
4. Build the shim against that DOM: the ten symbols of D3 Part 2, `goto` inert, `actx`
   null-or-real, a `nu`-native `apply_perms` that still sets `u2ts` and calls
   `set_fsearch()`, plus the self-check that walks the required-id and symbol lists and
   reports the first miss by name.
5. Build the loader: set `window.langmod` only if absent, then inject `ui.css`,
   `util.js` and `up2k.js` in that order on the sheet's first open, nonce-stamped, behind
   a loading state, with the self-check gating the injection. The panel comes alive here
   (D6).
6. Wire `ACTS[0]`: `show()` gains the `perms.write` test, `live()` returns true, `do()`
   opens the sheet (D2).
7. Style the panel into `nu`'s visual language in `nu.css` — the panel, the drop overlay
   at the desktop band, and whatever the open question decides to hide with
   `display:none` (D2, D3 Part 3, 0002 §out-of-scope).
8. Add the queue state to `render_stat` so a closed sheet still shows `3/7 · 62%` (D2).
9. Update `docs/nu-ui.md`: upload leaves "what is NOT built yet" (`:291-297`), the
   `classic UI` link stops being the answer for uploading (`:102-108`), and drag & drop
   leaves the wide band's list of what it still owes (`:220`).

## Verification (how to prove it, when it lands)

- The suite stays green and the diff contains **no `.py`** — the same bar 0001 and 0002
  cleared, and the reason D3's tripwire is a runtime self-check rather than a test file.
- The self-check of D3 fails loudly, naming the missing symbol or id, if any of the ten
  shim symbols or the required-id set goes missing. Prove it by deleting one id from the
  generated markup and confirming the sheet refuses to mount with that id's name on
  screen.
- On an English-language server, no `undefined` appears anywhere in the panel; on a
  `--lang por` server, no English does (D4).
- A live walk at 390×844 and 1440×900, after `make -C scripts/deps-docker` or
  `./scripts/make-sfx.sh fast dl-wd` has put `web/deps/sha512.hw.js` in place: upload one
  file, upload seven, cancel mid-queue, drop a folder on the desktop band, and confirm a
  re-upload of an already-present file is deduped by the handshake rather than re-sent.
- Under the default `--csp-ui`, the browser console shows no CSP violation after the
  first open, and `init_deps`' modal closes instead of hanging (D3 Part 4).
- Toggle `hashw` in the panel, reload, reopen the sheet, and confirm the toggle came back
  the way it was left — the `bcfg_get` failure of D3 Part 3 is invisible except across a
  reload.
- Load a listing with a stale `opmode` in `localStorage` from a classic-UI session, open
  the sheet, and confirm `nu` does not navigate anywhere (D3 Part 2,
  `up2k.js:3499-3507`).
- Open the sheet on a `--lang por` server and confirm the panel *and* the rest of `nu`
  are still translated afterwards — `util.js:310-311` is the failure D6 guards, and it
  shows up only after the injection.
- Open the sheet, close it, and confirm `nu`'s own listing, sort, selection and status
  line still behave — `util.js` is on the page from that moment on, and its `humansize`,
  `esc` and `window.onerror` are the collisions D6 names.
- With a user lacking `write`, the button does not render at all — `show()`, not a dead
  `live()`. A permission the server refuses is not a `nu` gap and must not look like one
  (the rule `SACTS`' delete row already states, `nu.js:2533-2536`).
