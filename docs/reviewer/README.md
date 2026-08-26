# Decisions dos reviewers-agentes — formato e propósito

Registro vivo do que os **reviewers-agentes** (CodeRabbit e afins) acharam nos PRs,
escrito pela skill `/pr`. É instrumento permanente, não lixo de trial.

- **`decisions.jsonl`** — a fonte da verdade, **append-only**. Uma linha JSON por achado
  triado. Sessões concorrentes nunca se sobrescrevem; o histórico fica auditável. Nunca
  reescrever nem apagar linhas passadas — só anexar.
- **`decisions.md`** — resumo **derivado e legível**, regenerado a partir do `.jsonl`.
  Pode ser recriado a qualquer momento; não é fonte da verdade.
- **`findings.jsonl`** — o espelho **verbatim** do que o reviewer escreveu, colhido da
  API do GitHub antes da triagem: `anchor_id`, `body`, `diff_hunk`, `path`,
  `line`/`original_line`, `html_url`, `commit_id` e o `severity_raw` do próprio
  reviewer. Uma linha por comentário, também **append-only**. É o que sobrevive quando
  o PR some ou o reviewer edita o comentário, e é por ele que um achado se **re-ancora**
  na árvore de hoje: o `anchor_id` casa com o `decisions.jsonl`, o `diff_hunk` localiza
  o trecho quando o `file:line` já apodreceu.
- **`pr_meta.jsonl`** — uma linha por par PR×reviewer com a **forma da passada**, não com
  o conteúdo dela: tamanho do diff (`additions`, `deletions`, `changed_files`,
  `commits`), os instantes (`first_comment_at`, `settled_at`, `harvested_at`), a
  `latency_s` derivada deles, o `sha` revisado e se a passada foi silenciada (`mute`).
  É o que responde "o reviewer aguentou este diff?" sem reler achado nenhum.

Os quatro são escritos na mesma colheita: `findings.jsonl` primeiro (cru),
`decisions.jsonl` depois (julgado), `decisions.md` derivado deste último, e o
`pr_meta.jsonl` fechando a passada.
