# the new UI (`nu`)

A second filebrowser UI that lives **alongside** the classic one; neither can
break the other. Nothing here changes server logic -- `nu` is a client of the
same JSON the classic UI already consumes.

## how a request picks a UI

Resolved in `httpcli.py`, in the `tpl = "browser"` block (~line 7296):

| request | UI |
|---|---|
| `?b` | `browser2` -- the basic no-JS browser. **always wins**; the panic button |
| `?opds` | the OPDS feed, untouched |
| `?ls` | JSON, untouched -- `nu` never hijacks the API or curl |
| `?nu` | the new UI, this request only |
| `?nu0` | the classic UI, even if the `ui=nu` cookie is set |
| cookie `ui=nu` | the new UI by default |
| otherwise | `browser` -- the classic UI, unchanged |

The cookie is set through the pre-existing `?setck=ui=nu` endpoint (`setck()`
in httpcli.py) and is listed in `ALL_COOKIES`, so "reset settings" clears it.

## the escape hatches (both directions)

- new -> classic: the `classic UI` link. When the cookie is set, that link
  **unpins** it, because the classic UI strips the query from the address bar
  -- a bare `?nu0` would not survive a reload.
- classic -> new: `switch to new UI`, next to the existing `switch to basic
  browser` in the upload pane.

## files

| file | what |
|---|---|
| `web/nu.html` | jinja template; registered in the `jn` list in `httpsrv.py` |
| `web/nu.js` | listing render + mode plumbing |
| `web/nu.css` | standalone -- does NOT load `ui.css`/`browser.css` |

`nu.html` also receives `cfg` (the volume's `js_ls`: `idx`, `dnsort`, `dsort`,
...), added to `j2a` in httpcli.py next to `sb_lg`.

Static files under `web/` are only served if allowlisted in `RES`
(`copyparty/__init__.py`), and only packed into the sfx if listed in
`scripts/sfx.ls`. **Add new files to both.** The gzip step in `web/Makefile`
globs `*.js *.css` at the root, so root-level names are picked up for free;
a subdirectory would need a Makefile rule.

## design

The mobile redesign lives in `design-handoff/` (prototypes, token list,
feature-coverage matrix). Type is the repo's own system stack, not the Geist
the prototypes were drawn in; every other token is reproduced exactly.

Built so far: the list and its rows, navigation, the sticky header (search,
filter chips, status line) and the sort sheet. Search filters the current
folder client-side; the server's recursive `POST /?srch` (which needs an
indexed volume, `-e2d`) is not wired up yet.

Not built, and therefore still reasons to reach for `classic UI`: selection
mode, swipe actions, pull-to-refresh, grid view, the folder-tree sheet, the
overflow menu, the settings screen and the image viewer. The header omits
the controls that would drive them rather than showing dead buttons.

## widths

`nu` is drawn as a phone design, but it is not a phone-only UI. Width is a
first-class variable with three bands, spelled in `em` so they track the
user's font size (the rest of `web/` is `em` too -- `ui.css:302`,
`md.css:274`):

| band | CSS | what it is |
|---|---|---|
| `< 44em` | no query at all -- the base rules | the handoff, unchanged |
| `44em-64em` | `@media (min-width: 44em) and (max-width: 63.99em)` | a centered 760px column; tablets and half-screen windows |
| `>= 64em` | `@media (min-width: 64em)` | tree dock + a column grid, content flush left and capped at `100em` |
| `>= 80em` | `@media (min-width: 80em)` | still the wide band, plus the Type column |

`>= 80em` adds a column to the wide band; it is not a fourth layout.

**One markup, three layouts.** The wide band is reached by CSS over the same
DOM the narrow band renders -- **never by a second render function**. A
second renderer for width is a bug, not an optimization: it doubles the cost
of every surface added after it, and it breaks the cheapest test there is --
a resize from 1200px to 380px must reflow without re-rendering, without
refetching the listing, and without losing sort, filter or scroll.

The one sanctioned exception is **grid view**, which is a genuinely different
renderer over the same `filtered()` output -- a different presentation of the
data, not a different width of the same presentation. It stays that way and
simply gets a wide tile size.

The corollary: a cell whose *text* differs per band carries both forms in the
DOM (`.nu_n` narrow, `.nu_w` wide) and CSS picks one. JS may not reformat a
cell it is not allowed to re-render.

**Width and capability are different questions, gated by different queries.**

| question | query | example |
|---|---|---|
| layout | `min-width` | how many columns, is there a dock |
| interaction | `pointer`, `hover` | is a long-press handler installed at all |

A 1024px touch tablet and a 1024px desktop window are the same layout and
emphatically not the same input, so a capability query never appears inside a
width query and never gates layout. Gestures are attached only under
`(pointer: coarse)`; the context menu only under
`(hover: hover) and (pointer: fine)`. Both are read in **JS** (`CAP` in
`nu.js`), not only in CSS, because a CSS-only gate hides the affordance while
leaving the listener attached. `CAP` re-reads each query on `mq.onchange` --
a capability latched once at boot is wrong on every device that changes input
mode. It deliberately does not reuse `util.js`'s `TOUCH`
(`'ontouchstart' in window`), which is a device fact true on every hybrid
laptop, and which `nu` could not see anyway since it never loads `util.js`.

**Nothing may be hover-only.** A hybrid laptop can be driven by finger at
1400px, so every action reachable by hover must also have a visible control.
The context menu is an accelerator for the row's actions, never their only
door.

### what the wide band has

Spec/plan 0002 built **four** things, and they are all of them:

1. **the tree dock** -- `#nu_tree`, the left column at `>= 64em`, reading
   `?tree=` and expanding lazily. It is opt-in in CSS: the 16em track is
   declared only under `#nu_shell[data-tree="1"]`, which `nu.js` writes when
   the dock actually renders, so `--ui-notree` leaves no empty gutter. Note
   what it roots at: the **shallowest legal non-empty ancestor** -- the first
   path component -- not the server's true root. `?tree=` only returns the
   ancestor-chain `k*` keys when `top` is a strict ancestor, and the only
   value naming the true root is the blank form, which the server wraps once
   per component of `args.R` under `-R` and is therefore unusable. Top-level
   siblings are not shown in this cut.
2. **the columns** -- name/size/date, plus type at `>= 80em`, as a grid on
   `.nu_row` (not on `#nu_list`, which would need `display: contents` on the
   rows and would destroy their background, border, hover and focus ring).
   The tracks live in `--nu-cols` so the header has one definition to copy.
3. **the column header** -- `#nu_head`, a sibling of `#nu_list` and never a
   child (`#nu_list` is `aria-live`), whose labels are a **second door to
   the same `pick_sort()`** the sort sheet drives. The sheet and its
   `#nu_sort` button stay at every width; the header does not replace them.
4. **desktop input on the surfaces that exist** -- row hover, focus rings,
   arrow/Home/End traversal with a typing guard, Enter as the browser's own
   activation of an `<a href>`, Escape, and the right-click menu rendered
   from the `CTX` table under `--ui-noctxb` and `CAP.on("fine")`.

### what the wide band still owes

Also **five** things, none of which 0002 built, all of which the wide band
needs before it is finished:

1. **selection** -- `nu` has no selection state at all. The checkbox is a
   permanent column at `>= 64em`, never a hover reveal, and shift/ctrl act
   on the checkbox (the row is an `<a href>`; a plain click must navigate).
2. **the action bar's wide placement** -- the slot is declared and empty:
   `#nu_tools`, in the status line beside `#nu_sort`. The contract on it is
   that the bar is **one component with two placements** -- this slot at
   `>= 64em`, the fixed bottom bar below it -- not a second bar with its own
   strings.
3. **the full keyboard map** -- what exists is list traversal, not a map;
   whoever adds one must also settle who owns `keydown` while an overlay is
   open, since traversal sits on a document-level listener.
4. **drag & drop upload** -- and upload generally; see *what is NOT built
   yet* below.
5. **mtp tag columns** -- the columns are the four fixed fields the listing
   already carries. Tag columns need the sort keys revisited too: `sorted()`
   still orders folders by `f.sz`, which is ~4096 wherever the recursive
   size was never filled.

There is also **no i18n wiring yet**. 0002 landed a `STR` table and a `t(k)`
shim in `nu.js` and routed every string it added through `t()`; lifting
`STR` into `Ls.eng` and replacing the shim's body with a per-key fallback is
0001 card 1's job. Until then a string added anywhere in `nu` goes in `STR`
and through `t()` -- not as a literal, which is the retrofit that ordering
exists to avoid.

### the ordering, so it is not re-derived

0002 (this contract) lands **first**; `docs/plans/0001-nu-the-rest-of-the-mobile-design.md`
is then re-planned **against this tree**. It is mechanical, not a
preference: both plans edit `nu.js`, `nu.css` and `nu.html` in every card,
so they cannot run in parallel, and 0001 was written against a single
viewport (390x844) at a time when it also owned the tree reader and the
i18n helper. The plan's *"What 0002 obliges 0001 to honor"* section is the
pendency list that re-plan consumes, card by card. Do not implement a 0001
card straight from the old plan.

## data contract

`ls0` is embedded in the HTML by the `is_js` branch of httpcli, so the first
paint needs no roundtrip. Further navigation refetches with `?ls`.

**The two shapes differ**: `tx_ls` (the `?ls` JSON) *drops* the `name` and
`dt` keys; the embedded `ls0` keeps them. `nu.js` reads both through `nm()`
and `dt()` -- keep it that way.

Item shape: `{lead, href, name?, sz, ext, dt?, ts}` plus `tags` when the
volume is indexed (`-e2t`).

## what is NOT built yet

Most importantly **upload**. The
classic `up2k.js` is not a library -- it drives ~47 specific element ids
(`u2conf`, `u2cards`, `u2etaw`, `nthread`, ...) and reimplementing it means
reimplementing chunked hashing, resume, and dedup (protocol in
`docs/up2k.txt`). Until that is done, uploading is what the `classic UI`
link is for.

Also missing: recursive search, the navpane tree, the media player, the
markdown viewer/editor, thumbnails/gallery, the file manager
(rename/move/delete), unpost, shares, and the settings pane. The handoff's
coverage matrix scores 38 classic-UI features: 9 covered by the design, 9
partial, 11 still to design, 9 deliberately out of scope.
