# autodeploy

Publica em produção, sozinho, cada push feito no fork
`https://github.com/felipe-a-holanda/copyparty` (branch `hovudstraum`).

## por que polling, e não webhook

O copyparty desta máquina escuta em `127.0.0.1:3923` — só loopback. O GitHub não
tem como alcançá-la. Sobra polling, e aqui ele é barato: `git ls-remote` é uma
requisição HTTPS que não baixa objeto nenhum. O ciclo caro (fetch, build,
restart) só acontece quando o SHA remoto difere do que está no ar.

## o estado é o symlink

    /usr/local/bin/copyparty-sfx.py -> /usr/local/lib/copyparty/copyparty-sfx-<sha40>.py

Não existe arquivo de controle dizendo "a versão X está publicada": o alvo do
symlink **é** essa informação, e o SFX ainda carrega o `git describe` no próprio
corpo (`VER = "1.20.20-4-gfbcb7733"`). Nada para dessincronizar, e `ls -l` no
binário responde a pergunta.

As últimas 5 releases ficam em `/usr/local/lib/copyparty/`, o que faz do rollback
um retarget de symlink.

## o ciclo

1. `git ls-remote` no fork → SHA de `hovudstraum`. Igual ao que está no ar: sai
   calado (o caso comum, a cada 2 min).
2. Clone dedicado em `/srv/apps/copyparty/src` — **nunca** o checkout de trabalho:
   `fetch` + `reset --hard <sha>`. O que está no fork é o que vai ao ar, sem
   chance de empacotar arquivo não commitado.
3. `make-sfx.sh fast dl-wd` rodando como `felipe`, não como root.
4. Instala a release, troca o symlink (`mv -T`, atômico) e reinicia a unit.
5. Health check: até 45s esperando `systemctl is-active` **e** uma resposta HTTP
   em `127.0.0.1:3923`. Se não vier, **reverte para a release anterior** e
   reinicia de novo, deixando o erro no journal.

Root só faz install, symlink e restart; o build — que executa código vindo do
repo — roda sem privilégio.

## custo, medido

Neste hardware (22/08/2026, clone virgem do fork):

| etapa | tempo |
|---|---|
| `git ls-remote` — o único passo do ciclo ocioso | ~0,2s, zero objeto baixado |
| build completo, `web/deps/` ausente | **6s** |
| build seguinte, deps já em cache no clone | **3s** |

Ou seja: do push ao ar, tipicamente meio ciclo do timer (~1 min de espera) mais
uns 15s de trabalho. O intervalo de 2 min está em `copyparty-autodeploy.timer`
(`OnUnitActiveSec`) e pode cair para 1 min sem custo relevante.

Na primeira vez, o `dl-wd` do `make-sfx.sh` baixa o `copyparty-sfx.py` oficial do
**upstream (9001)** e extrai dele os `web/deps/` que o git não versiona — assets
de terceiros, idênticos nos dois repos. Isso roda como `felipe`, sem privilégio,
e só se repete se o clone perder os deps.

## operar

    sudo systemctl start copyparty-autodeploy.service   # publicar já, sem esperar
    journalctl -u copyparty-autodeploy -f               # acompanhar
    ls -l /usr/local/bin/copyparty-sfx.py               # o que está no ar
    ls -lt /usr/local/lib/copyparty/                    # releases guardadas
    sudo systemctl disable --now copyparty-autodeploy.timer   # desligar

Rollback manual para uma release específica:

    sudo ln -sfn /usr/local/lib/copyparty/copyparty-sfx-<sha>.py /usr/local/bin/copyparty-sfx.py.new
    sudo mv -Tf /usr/local/bin/copyparty-sfx.py.new /usr/local/bin/copyparty-sfx.py
    sudo systemctl restart copyparty

O timer volta a publicar o `HEAD` do fork no ciclo seguinte — para segurar um
rollback, desligue o timer antes.

## ajustar

Todas as variáveis do topo de `copyparty-autodeploy` podem ser sobrescritas por
ambiente na unit (`systemctl edit copyparty-autodeploy.service`), entre elas
`BRANCH`, `BUILD_ARGS`, `HEALTH_TIMEOUT` e `KEEP`.

O deployer **não se auto-atualiza**: mudou algo em `contrib/autodeploy/`, ele
avisa no journal e você roda `sudo ./contrib/autodeploy/install.sh` de novo.
