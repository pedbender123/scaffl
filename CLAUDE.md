# SCAFFL — repositório público

Este repositório é a versão pública (source-available) do SCAFFL: só a aplicação
que funciona e registra dados. Ele é **gerado a partir do repositório privado**
(`scaffl-private`) pelo script de exportação de lá.

Regras para quem trabalha aqui (pessoas ou Claude):

- Não adicionar material de pesquisa (teoria, metodologia, bibliografia, análise,
  dados de estudo, notas internas). Isso vive no privado.
- Correções feitas direto aqui precisam ser levadas também para o privado, senão
  a próxima exportação as sobrescreve.
- Novo `.md` só entra se estiver liberado em `scripts/seguranca/md-publicos.txt`.
- Antes de commitar: `scripts/seguranca/verificar-segredos.sh` e
  `scripts/seguranca/verificar-publico.sh .` (ou ative o hook com
  `scripts/seguranca/instalar-hooks.sh`).
- `main` = última versão lançada. Cada versão ganha tag `vX.Y.Z` e entrada no
  `CHANGELOG.md`.
- Licença: uso de pesquisa não comercial, sem redistribuição (ver `LICENSE`).
