#!/usr/bin/env bash
# Portão do repositório público: garante que uma pasta (exportação ou clone do
# público) não contém material interno.
#
# Uso:
#   scripts/seguranca/verificar-publico.sh <pasta> [arquivo-de-termos]
#
# Verifica:
#   1. caminhos internos (caminhos-privados.txt)
#   2. arquivos .md não liberados (md-publicos.txt)
#   3. termos de pesquisa interna, se um arquivo de termos for passado
#      (no privado: publicacao/termos-privados.txt — a lista não vai para o público)
#   4. chaves e arquivos sensíveis (verificar-segredos.sh --dir)
set -uo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ALVO="${1:?uso: verificar-publico.sh <pasta> [arquivo-de-termos]}"
TERMOS="${2:-}"
[ -n "$TERMOS" ] && TERMOS="$(cd "$(dirname "$TERMOS")" && pwd)/$(basename "$TERMOS")"
cd "$ALVO"

limpar() { grep -vE '^[[:space:]]*(#|$)' "$1"; }
ARQUIVOS="$(find . -path ./.git -prune -o -path '*/node_modules' -prune -o -path '*/dist' -prune -o -type f -print | sed 's|^\./||' | sort)"
falhou=0

r="$(echo "$ARQUIVOS" | grep -Ef <(limpar "$AQUI/caminhos-privados.txt"))"
if [ -n "$r" ]; then falhou=1; echo "✗ Caminhos internos:"; echo "$r" | sed 's/^/    /'; fi

r="$(echo "$ARQUIVOS" | grep -E '\.md$' | grep -vEf <(limpar "$AQUI/md-publicos.txt"))"
if [ -n "$r" ]; then falhou=1; echo "✗ Arquivos .md não liberados (libere em scripts/seguranca/md-publicos.txt):"; echo "$r" | sed 's/^/    /'; fi

if [ -n "$TERMOS" ]; then
  r="$(grep -rnIiE -f <(limpar "$TERMOS") --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist . | sed 's|^\./||' | cut -c1-140)"
  if [ -n "$r" ]; then falhou=1; echo "✗ Termos de pesquisa interna:"; echo "$r" | sed 's/^/    /'; fi
fi

if ! saida="$("$AQUI/verificar-segredos.sh" --dir . 2>&1)"; then falhou=1; echo "$saida"; fi

if [ "$falhou" -eq 0 ]; then echo "✓ Pasta pronta para o público: $ALVO"; fi
exit "$falhou"
