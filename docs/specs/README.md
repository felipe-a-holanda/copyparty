# Specs

Decisões de mudança (o quê & porquê) do fluxo `/spec → /planc → /exec`. O número
nasce na spec; o plano em `docs/plans/<NNNN>-<slug>.md` espelha o mesmo número.

> **Forma da linha (magra):** a célula **Title** é o título curto + o `headline` da spec
> como preâmbulo de negócio (uma frase) — só o título quando não há `headline:`. A célula
> **Evidence** é o SHA-range (`<primeiro>..<último>`) + uma frase nomeando os artefatos e o
> estado. O detalhe — arquivos tocados, saga de merge, contagem de testes — mora na spec/plano
> linkados, não na linha. A linha pode quebrar em duas linhas visuais; não deve virar o corpo.

## The specs

| Spec | Title | Status | Evidence in the code |
|---|---|---|---|
| [0003](0003-nu-upload.md) | Upload: nu hosts the real up2k instead of reimplementing it. A phone can finally put files into copyparty from the new UI, and a desktop can drag a whole folder onto it, instead of being bounced to the old interface by a button that admits it does not work. | pousado | `c2b64200..ea1e4cc2` — bootstrap `CGV1`/`JS_NONCE`, as 140 chaves de `Ls.eng`, o painel up2k como quinto tenant de `sheet()`, o shim de `browser.js` com auto-checagem de contrato, a injeção ordenada `ui.css`→`util.js`→`up2k.js` e o progresso na status line; suíte verde (31), zero `.py` no diff e nenhum arquivo novo em `web/` — walk viva feita: 24 arquivos subiram de verdade, dedupe e `--lang por` provados; falta só o gesto físico de arrastar pasta. |

## Recently landed

| Spec | Title | Status | Evidence in the code |
|---|---|---|---|
| [0002](0002-nu-desktop-is-a-first-class-width.md) | Desktop is a first-class width: the responsive contract for nu. On a large screen the new UI stops being a phone layout stretched to 760px — a docked folder tree, sortable columns and click-to-select make it something a mouse can actually drive. | pousado | `403b87c5..0418a0a3` — three bands over one markup, per-field row cells, the sortable column header, the docked `?tree=` widget, desktop hover/focus/arrow-key/context-menu input and the wide header with 0001's `#nu_tools` slot; suite green (31) and no `.py` in the diff, falta a walk viva em 390×844 e 1440×900. |
| [0001](0001-nu-the-rest-of-the-mobile-design.md) | The rest of the mobile design: nu beyond the base layer. A phone can browse, sort, select, move, delete, share and preview files in the new UI without ever falling back to the old one, and the settings it offers finally stick. | pousado | `f3ca08f9..bc1021f4` — i18n com fallback por chave, action bar nas duas colocações e o ⋯ router, preferências e a tela de configurações, grid e thumbnails, o tree sheet, seleção, swipe e pull-to-refresh, o visualizador de imagens e a busca recursiva; suíte verde (31) e zero `.py` no diff, falta a walk viva em 390×844 e 1440×900. Upload segue diferido pra spec própria. |
