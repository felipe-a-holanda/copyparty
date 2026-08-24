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

- new -> classic: the `The classic UI` row in the `⋯` router (it used to be
  a link in the nav bar; it is a row in the `MENU` table now, so it is a
  handler and not a node a re-render can destroy). When the cookie is set,
  it **unpins** it, because the classic UI strips the query from the address
  bar -- a bare `?nu0` would not survive a reload. The right-click menu's
  `Open in the classic UI` is an accelerator for one row and navigates to
  `?nu0` on its own.
- classic -> new: `switch to new UI` (`#nusw`, `browser.html:40`), next to
  the existing `switch to basic browser` in the upload pane.

## files

| file | what |
|---|---|
| `web/nu.html` | jinja template; registered in the `jn` list in `httpsrv.py` |
| `web/nu.js` | the whole client: strings, preferences, the two renderers, the tree, selection, the gestures, the viewer, search |
| `web/nu.css` | standalone -- does NOT load `ui.css`/`browser.css` |

`nu.html` also receives `cfg` (the volume's `js_ls`: `idx`, `dnsort`, `dsort`,
...), added to `j2a` in httpcli.py next to `sb_lg`. It is **per volume**,
which is why `cfg.idx` and not `srvcfg.have_up2k_idx` is what gates
recursive search; `srvcfg` (`cgv1`) carries the server-wide capabilities
and the admin's `ui_*` switches.

Static files under `web/` are only served if allowlisted in `RES`
(`copyparty/__init__.py`), and only packed into the sfx if listed in
`scripts/sfx.ls`. **Add new files to both.** The gzip step in `web/Makefile`
globs `*.js *.css` at the root, so root-level names are picked up for free;
a subdirectory would need a Makefile rule.

## design

The mobile redesign lives in `design-handoff/` (prototypes, token list,
feature-coverage matrix). Type is the repo's own system stack, not the Geist
the prototypes were drawn in; every other token is reproduced exactly.

Built: the list and its rows, navigation, the sticky header (search, filter
chips, status line), the sort sheet and the wide band's column header, the
i18n layer, the preference layer and the settings screen, grid view and
thumbnails, the folder tree in both of its containers (the wide dock and
the narrow bottom sheet), the `⋯` router, selection mode, swipe actions,
pull-to-refresh, the image viewer, and recursive search.

**Search is two tiers, and they are different questions.** `filtered()` is
the instant one: a substring test over the rows already on screen, run on a
90ms debounce while you type, costing nothing and never leaving this
folder. Enter is the second: `POST <SR>/?srch` with the classic UI's own
body shape, scoped to this folder and below through the query DSL's `path`
keyword. The hits replace the listing and render through the same
`render_list`/`render_grid` -- they are items in the shape `?ls` hands
`take()`, with the path in the name cell -- so they land in the wide band's
own columns with no CSS of their own.

The second tier is gated on `cfg.idx` (`"e2d" in vf`, per volume), and that
gate is not an optimization. Measured against a live server with no `-e2d`,
`?srch` does **not** fail: it answers `200` with an empty hit list, because
`u2idx.get_cur()` returns `None` for a volume with no `e2d` flag and
`run_query` skips it -- indistinguishable, on screen, from "nothing
matched". So on an unindexed volume the placeholder keeps saying *in this
folder* and no request is issued at all. The `500` in `handle_search` is
about the u2idx pool being unavailable, not about the index being absent.

The server also rate-limits consecutive searches -- `429` when the previous
query cost more than 0.7s and less than 0.7s of idle has passed
(`handle_search`) -- and that is surfaced in a strip under the search box,
with the previous hits left standing behind it. Swallowed into "0 results"
it would say the file is gone when what happened is that the user pressed
Enter twice.

While hits are the list, three things step aside: `filtered()` stops
re-applying the query (the server matched it in SQL, where `%` is a
wildcard, so an `indexOf()` retest would drop rows the count still claims),
selection mode refuses to open (`?zip` posts basenames at the folder we are
standing in, and a hit two levels down is not one), and the back row is
gone (these rows are not a folder's contents).

Still reasons to reach for `classic UI`: **upload** above all, and the
surfaces the `⋯` router lists as declared-and-disabled -- new `.md` note,
send a message to the log, unpost, recent uploads, shares, the control
panel -- plus rename, move, the media player and the markdown
viewer/editor. Spec 0001 D2's rule is that a thing `nu` has not built yet
is a **visibly dead control that can explain itself**, never a hidden one:
`Upload files` is rendered dead and routes to `?nu0`; `Move` says so when
tapped. A thing the *server* refuses (`--no-del`, `--no-mv`) is not
rendered at all, because a server's refusal is not a `nu` gap and must not
look like one.

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

0001 then filled two of the holes 0002 left in it, without adding a
width-specific renderer to either:

- **selection** -- the checkbox is a permanent column at `>= 64em`, never a
  hover reveal, and ctrl/shift act on it (the row is an `<a href>`; a plain
  click must still navigate). Shift+arrow is the keyboard's own door into
  the mode.
- **the action bar's wide placement** -- `#nu_tools`, in the status line
  beside `#nu_sort`. The contract held: it is **one component with two
  placements**, rendered by `render_acts()` into whichever container
  `CAP.wide` names, from one table and one set of i18n keys. Not a second
  bar with its own strings.

### what the wide band still owes

**Three** things, and search hits obey the same rules as listing rows in
all three:

1. **the full keyboard map** -- what exists is list traversal plus
   shift+arrow selection, not a map. Ownership of `keydown` while an
   overlay is open is now half-settled -- the image viewer claims it
   explicitly, in the same document-level listener rather than a second
   one, and Escape is handled above the typing guard -- but nothing else
   has a shortcut, and whoever adds one inherits that listener.
2. **drag & drop upload** -- and upload generally; see *what is NOT built
   yet* below.
3. **mtp tag columns** -- the columns are the four fixed fields the listing
   already carries. Tag columns need the sort keys revisited too: `sorted()`
   still orders folders by `f.sz`, which is ~4096 wherever the recursive
   size was never filled.

### strings

Every string in `nu` goes through `t(k)`, and `t()` falls back **per key**:
`Ls[lang][k]`, else `Ls.eng[k]`, else the key itself. That is deliberately
not what the classic UI does (`Ls[lang] || Ls.eng` resolves the language as
one object, so a key a `tl` file predates renders as `undefined`) -- it is
what lets `nu` ship strings the 22 `tl` files have never seen without
making a translated install worse than an english one.

`Ls` is declared in `nu.html`'s bootstrap block, not in `nu.js` and not in
`util.js` (which `nu` never loads): the `tl/{{ lang }}.js` tag has to run
between the two. That tag is **guarded on `lang != "eng"`**, unlike
`browser.html`'s -- there is no `web/tl/eng.js` and `--lang` defaults to
`eng`, so an unguarded tag is a 404 on every default install.

Two rules keep the table honest. A string the classic UI already ships is
reused **by key** (`gt_name`, `gt_sz`, `ctx_dl`, ...), so the `tl` files
answer it with no new translation work. Everything genuinely new is
namespaced `nu_`, because a `tl` file's top-level keys are the classic UI's
and a bare name like `s_sz` is already taken over there -- a collision
would not fail, it would render someone else's translation.

### what each spec owned

Both specs are landed; this is the record, not a plan.

**0002** established the contract this file describes: the three width
bands over one markup, `CAP` as the capability layer, the tree dock and its
`?tree=` reader, the column grid and its header, and desktop input (hover,
focus, traversal, the right-click menu). It ran first because both specs
edit `nu.js`, `nu.css` and `nu.html` in every card, so they could not run
in parallel.

**0001** was re-planned against the tree 0002 left and then built the rest
of the mobile design on it, in eight cards: the i18n layer, the multi-tenant
sheet, the action bar in both placements and the `⋯` router; the preference
layer (reusing the classic UI's bare localStorage keys for the four settings
both UIs have) and the settings screen; grid view and thumbnails; the tree
mounted once and shared by the dock and a new bottom sheet; selection mode;
swipe actions and pull-to-refresh, both gated on `CAP.on("coarse")`; the
image viewer; and recursive search.

## data contract

`ls0` is embedded in the HTML by the `is_js` branch of httpcli, so the first
paint needs no roundtrip. Further navigation refetches with `?ls`.

**The two shapes differ**: `tx_ls` (the `?ls` JSON) *drops* the `name` and
`dt` keys; the embedded `ls0` keeps them. `nu.js` reads both through `nm()`
and `dt()` -- keep it that way.

Item shape: `{lead, href, name?, sz, ext, dt?, ts}` plus `tags` when the
volume is indexed (`-e2t`).

A **search hit** is turned into that same shape by `hit_item()`, which is
what lets it render through the existing renderers instead of a third row
markup. Two differences: its `name` is the path relative to the folder the
search was scoped to (that is the question the row answers), and it carries
one extra key, `vp` -- its absolute, decoded vpath, which `vp_of()` prefers
because a hit is not in the folder we are standing in and `?delete` wants
the real path.

## what is NOT built yet

Most importantly **upload**, which is deferred to a spec of its own. The
classic `up2k.js` is not a library -- it drives ~47 specific element ids
(`u2conf`, `u2cards`, `u2etaw`, `nthread`, ...) and reimplementing it means
reimplementing chunked hashing, resume, and dedup (protocol in
`docs/up2k.txt`). Until that is done, uploading is what the `classic UI`
link is for, and `Upload files` is a rendered-dead button that routes there
rather than a hidden one.

Also missing, and all of them **parity-only** -- surfaces the classic UI
has that the mobile design never drew:

- **the media player** (audio and video) and the **markdown
  viewer/editor** -- the `New .md note` router row is declared and
  disabled, not wired.
- **rename** and **move**. Delete is built (the action bar, the swipe and
  the right-click row all end in one `?delete`), and `Move` is declared and
  dead on purpose: it is one request per selected item, and a folder source
  is a long abortable server-side walk, so the flow needs progress and
  cancellation.
- **unpost**, **recent uploads**, **shares**, **the control panel**, and
  **send a message to the log** -- five rows the `⋯` router already
  declares and renders disabled, so a later spec lands a handler instead of
  redesigning the sheet. Two more (`control panel`, `log out`) are the same
  kind of row inside the settings screen.
- **mtp tag columns** in the wide band; see *what the wide band still owes*.

The handoff's coverage matrix scores the **design**, not the build: 38
classic-UI features, 9 covered by the design, 9 partial, 11 still to
design, 9 deliberately out of scope.
