#!/usr/bin/env bash
# Ativa os hooks do repositório (.githooks/) neste clone.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
git config core.hooksPath .githooks
echo "✓ Hooks ativados: todo commit passa por scripts/seguranca/verificar-segredos.sh --staged"
