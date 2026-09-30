#!/usr/bin/env bash
# Procura chaves, senhas e arquivos sensíveis no repositório.
#
# Uso:
#   scripts/seguranca/verificar-segredos.sh              # arquivos versionados (HEAD + mudanças atuais)
#   scripts/seguranca/verificar-segredos.sh --staged     # só o que está no stage (usado no pre-commit)
#   scripts/seguranca/verificar-segredos.sh --historico  # todo o histórico de todas as branches
#   scripts/seguranca/verificar-segredos.sh --dir <pasta> # uma pasta qualquer (ex.: exportação p/ o público)
#
# Falsos positivos: adicione uma regex em .secretsignore (na raiz do repo);
# qualquer achado cuja linha case com ela é ignorado.
set -uo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PADROES="$AQUI/padroes-segredos.txt"
PROIBIDOS="$AQUI/arquivos-proibidos.txt"
MODO="${1:---arvore}"
ALVO="${2:-.}"

limpar() { grep -vE '^[[:space:]]*(#|$)' "$1"; }
PADROES_TMP="$(mktemp)"; PROIBIDOS_TMP="$(mktemp)"
trap 'rm -f "$PADROES_TMP" "$PROIBIDOS_TMP"' EXIT
limpar "$PADROES" > "$PADROES_TMP"
limpar "$PROIBIDOS" > "$PROIBIDOS_TMP"

ignorar() {
  local raiz="$1"
  if [ -f "$raiz/.secretsignore" ] && [ -n "$(limpar "$raiz/.secretsignore")" ]; then
    grep -vEf <(limpar "$raiz/.secretsignore")
  else
    cat
  fi
}

achados_conteudo=""; achados_arquivos=""
case "$MODO" in
  --arvore)
    RAIZ="$(git rev-parse --show-toplevel)"; cd "$RAIZ"
    achados_conteudo="$(git grep -nIE -f "$PADROES_TMP" -- . ':!scripts/seguranca/padroes-segredos.txt' ':!.secretsignore' | ignorar "$RAIZ")"
    achados_arquivos="$(git ls-files | grep -Ef "$PROIBIDOS_TMP")"
    ;;
  --staged)
    RAIZ="$(git rev-parse --show-toplevel)"; cd "$RAIZ"
    achados_conteudo="$(git grep --cached -nIE -f "$PADROES_TMP" -- . ':!scripts/seguranca/padroes-segredos.txt' ':!.secretsignore' | ignorar "$RAIZ")"
    achados_arquivos="$(git diff --cached --name-only --diff-filter=ACR | grep -Ef "$PROIBIDOS_TMP")"
    ;;
  --historico)
    RAIZ="$(git rev-parse --show-toplevel)"; cd "$RAIZ"
    # shellcheck disable=SC2046
    achados_conteudo="$(git grep -nIE -f "$PADROES_TMP" $(git rev-list --all) -- . ':!scripts/seguranca/padroes-segredos.txt' ':!.secretsignore' | ignorar "$RAIZ" | sort -u -t: -k2,4)"
    achados_arquivos="$(git log --all --name-only --pretty=format: | sort -u | grep -Ef "$PROIBIDOS_TMP")"
    ;;
  --dir)
    RAIZ="$(cd "$ALVO" && pwd)"; cd "$RAIZ"
    achados_conteudo="$(grep -rnIE -f "$PADROES_TMP" --exclude-dir=.git --exclude-dir=node_modules --exclude=padroes-segredos.txt --exclude=.secretsignore . | sed 's|^\./||' | ignorar "$RAIZ")"
    achados_arquivos="$(find . -path ./.git -prune -o -path '*/node_modules' -prune -o -type f -print | sed 's|^\./||' | grep -Ef "$PROIBIDOS_TMP")"
    ;;
  -h|--help) sed -n '2,13p' "$0"; exit 0 ;;
  *) echo "Modo desconhecido: $MODO (use --help)"; exit 2 ;;
esac

falhou=0
if [ -n "$achados_arquivos" ]; then
  falhou=1
  echo "✗ Arquivos sensíveis versionados:"
  echo "$achados_arquivos" | sed 's/^/    /'
fi
if [ -n "$achados_conteudo" ]; then
  falhou=1
  echo "✗ Possíveis chaves/senhas encontradas:"
  # Mostra só o início da linha para não reimprimir o segredo inteiro no log
  echo "$achados_conteudo" | cut -c1-140 | sed 's/^/    /'
fi
if [ "$falhou" -eq 0 ]; then
  echo "✓ Nenhum segredo encontrado ($MODO)."
else
  echo
  echo "Se for falso positivo, adicione uma regex em .secretsignore."
  echo "Se for segredo real: remova, e TROQUE a chave (ela já pode ter vazado)."
fi
exit "$falhou"
