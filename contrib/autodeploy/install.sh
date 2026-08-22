#!/usr/bin/env bash
# instala (ou reconcilia) o autodeploy do copyparty. idempotente: rode quantas vezes quiser.
#   sudo ./contrib/autodeploy/install.sh
set -Eeuo pipefail

SRC=${SRC:-/srv/apps/copyparty/src}
LIB=${LIB:-/usr/local/lib/copyparty}
BIN=${BIN:-/usr/local/bin/copyparty-sfx.py}
BUILD_USER=${BUILD_USER:-felipe}
UNIT=${UNIT:-copyparty}

here=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
say() { printf '  %s\n' "$*"; }

[ "$(id -u)" = 0 ] || { echo "rode com sudo"; exit 1; }
systemctl cat "$UNIT" >/dev/null 2>&1 || { echo "unit $UNIT nao existe; nada a fazer"; exit 1; }
id -u "$BUILD_USER" >/dev/null || exit 1

echo
echo "instalando autodeploy do copyparty"

install -m755 -o root -g root "$here/copyparty-autodeploy" /usr/local/sbin/copyparty-autodeploy
say "/usr/local/sbin/copyparty-autodeploy"

install -d -m755 "$LIB"
install -m644 -o root -g root "$here/README.md" "$LIB/README.md"

# o binario que esta no ar vira uma release nomeada, e o path da unit vira symlink.
# sem isto o primeiro deploy nao teria para onde reverter.
if [ -L "$BIN" ]; then
	say "$BIN ja e symlink -> $(readlink -f "$BIN")"
elif [ -f "$BIN" ]; then
	pre="$LIB/copyparty-sfx-preexisting.py"
	[ -f "$pre" ] || install -m755 -o root -g root "$BIN" "$pre"
	ln -sfn "$pre" "$BIN.new"
	mv -Tf "$BIN.new" "$BIN"
	say "binario anterior preservado em $pre; $BIN agora e symlink"
else
	say "AVISO: $BIN nao existe; o primeiro deploy o criara, sem rede de rollback"
fi

install -d -m755 -o "$BUILD_USER" -g "$BUILD_USER" "$SRC"
say "$SRC (dono $BUILD_USER) — o clone nasce no primeiro ciclo"

install -m644 -o root -g root "$here/copyparty-autodeploy.service" /etc/systemd/system/
install -m644 -o root -g root "$here/copyparty-autodeploy.timer"   /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now copyparty-autodeploy.timer
say "timer ativo"

echo
systemctl list-timers copyparty-autodeploy.timer --no-pager || true
cat <<'TXT'

  publicar agora, sem esperar o timer:
    sudo systemctl start copyparty-autodeploy.service

  acompanhar:
    journalctl -u copyparty-autodeploy -f
    ls -l /usr/local/bin/copyparty-sfx.py

  desligar:
    sudo systemctl disable --now copyparty-autodeploy.timer

TXT
