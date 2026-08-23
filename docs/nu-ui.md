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
