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
| [0001](0001-nu-the-rest-of-the-mobile-design.md) | The rest of the mobile design: nu beyond the base layer. A phone can browse, sort, select, move, delete, share and preview files in the new UI without ever falling back to the old one, and the settings it offers finally stick. | planejado | plan written, ready for `/exec docs/plans/0001-nu-the-rest-of-the-mobile-design.md`. The base layer landed in `0affcaee`; the eight cards that follow it are unbuilt. Upload is deferred to its own spec. |
| [0002](0002-nu-desktop-is-a-first-class-width.md) | Desktop is a first-class width: the responsive contract for nu. On a large screen the new UI stops being a phone layout stretched to 760px — a docked folder tree, sortable columns and click-to-select make it something a mouse can actually drive. | planejado | plan written, ready for `/exec docs/plans/0002-nu-desktop-is-a-first-class-width.md`. The lone breakpoint is `nu.css:518`, which just centers the phone column; no docked tree, no column grid, no pointer-capability gate. Six cards, one lane; lands before 0001 and leaves it a clause per card to re-plan. |

## Recently landed

| Spec | Title | Status | Evidence in the code |
|---|---|---|---|
