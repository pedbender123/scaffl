# Changelog

Versões funcionais do SCAFFL público, em ordem cronológica.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/);
versões seguem [SemVer](https://semver.org/lang/pt-BR/) (`vMAJOR.MINOR.PATCH`).

## [0.2.0] — a definir

### Adicionado
- Motor de cotas: Lab por requisição, Petrus por créditos semanais (`server/quota.ts`, `server/limiter.ts`).
- Cadeia de fallback de modelos e instrumentação de uso (métricas de cota no admin).
- Diálogos de confirmação no Lab.
- Verificação de segredos (`scripts/seguranca/`), hook de pre-commit e CI de segurança.
- `CITATION.cff` para citação do projeto.

### Alterado
- **Licença:** de MIT para a Licença de Uso para Pesquisa SCAFFL (uso não comercial, citação obrigatória, sem redistribuição). A v0.1.0 continua sob MIT.
- A rota `/` abre direto a tela de login/cadastro.
- `docker-compose.yml` genérico para instalação própria.

### Removido
- Ferramenta de contato por WhatsApp.
- Conteúdo institucional e de pesquisa (disponível em https://scaffl.com.br).

## [0.1.0] — 2026-06

### Adicionado
- Primeira versão pública self-hosted: personas/mural, Lab de simuladores, sala de aula (AVA), BYOK multi-provedor, suíte de testes de segurança, SQLite.
