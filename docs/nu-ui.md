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

Static files under `web/` are only served if allowlisted in `RES`
(`copyparty/__init__.py`), and only packed into the sfx if listed in
`scripts/sfx.ls`. **Add new files to both.** The gzip step in `web/Makefile`
globs `*.js *.css` at the root, so root-level names are picked up for free;
a subdirectory would need a Makefile rule.

## data contract

`ls0` is embedded in the HTML by the `is_js` branch of httpcli, so the first
paint needs no roundtrip. Further navigation refetches with `?ls`.

**The two shapes differ**: `tx_ls` (the `?ls` JSON) *drops* the `name` and
`dt` keys; the embedded `ls0` keeps them. `nu.js` reads both through `nm()`
and `dt()` -- keep it that way.

Item shape: `{lead, href, name?, sz, ext, dt?, ts}` plus `tags` when the
volume is indexed (`-e2t`).

## what the skeleton does NOT do yet

Everything past listing and navigation, most importantly **upload**. The
classic `up2k.js` is not a library -- it drives ~47 specific element ids
(`u2conf`, `u2cards`, `u2etaw`, `nthread`, ...) and reimplementing it means
reimplementing chunked hashing, resume, and dedup (protocol in
`docs/up2k.txt`). Until that is done, uploading is what the `classic UI`
link is for.

Also missing: search, the navpane tree, the media player, the markdown
viewer/editor, thumbnails/gallery, the file manager (rename/move/delete),
unpost, shares, and the settings pane.
