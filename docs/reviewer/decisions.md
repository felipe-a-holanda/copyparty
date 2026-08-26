# Decisions dos reviewers-agentes

> Resumo **derivado** de `decisions.jsonl`. Regenerável a qualquer momento; não é fonte
> da verdade. Uma linha por achado triado.

| PR | SHA | Data | Reviewer | Anchor | Arquivo:linha | Sev | Veredito | Overlap | Rota |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `de0878a5` | 2026-08-25 | coderabbit | `gh:3848537956` | `docs/specs/0001-nu-the-rest-of-the-mobile-design.md:26` | baixa | real | exclusivo | fix |
| 1 | `de0878a5` | 2026-08-25 | coderabbit | `cr:11f6eaf1…` | `copyparty/web/nu.css:139` | trivial | nitpick | exclusivo | drop |

## PR 1 — `dev → main` (promoção do `nu`)

A passada assentou em 772 s sobre 9990 linhas adicionadas em 10 arquivos, 51 commits.
Nenhum achado de correção: o reviewer leu `nu.js` (+4614), `nu.css` (+2447) e `nu.html`
(+264) e não apontou um defeito de runtime sequer. Os dois achados são de documentação e
de manutenibilidade.

- **`gh:3848537956` — real, baixa.** Nas duas specs a frase `**Status:**` do corpo ainda
  diz `planejado` enquanto o `status:` do frontmatter, a tabela do `docs/specs/README.md`
  e a coluna de evidência já dizem `pousado`. Confirmado no head promovido (`de0878a5`),
  nos dois arquivos: `0001` linha 25 e `0002` linha 26. É deriva de prosa, sem efeito de
  runtime, mas é real e o conserto são duas linhas.
- **`cr:11f6eaf1…` — nitpick, trivial.** As linhas 139-181 do `nu.css` repetem valor por
  valor as 93-136: a mesma paleta escura precisa ser alcançável por dois gatilhos
  distintos (a preferência do SO e o toggle manual), e custom properties não permitem
  compartilhar uma declaração entre os dois seletores sem uma terceira indireção. A
  sugestão é um comentário de sincronização, não uma mudança de comportamento.
