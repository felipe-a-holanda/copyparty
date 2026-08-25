# Decisions dos reviewers-agentes — formato e propósito

Registro vivo do que os **reviewers-agentes** (CodeRabbit e afins) acharam nos PRs,
escrito pela skill `/pr`. É instrumento permanente, não lixo de trial.

- **`decisions.jsonl`** — a fonte da verdade, **append-only**. Uma linha JSON por achado
  triado. Sessões concorrentes nunca se sobrescrevem; o histórico fica auditável. Nunca
  reescrever nem apagar linhas passadas — só anexar.
- **`decisions.md`** — resumo **derivado e legível**, regenerado a partir do `.jsonl`.
  Pode ser recriado a qualquer momento; não é fonte da verdade.
