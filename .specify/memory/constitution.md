<!--
Sync Impact Report
===================
- Version change: 1.0.0 -> 1.1.0
- Bump rationale: MINOR - expanded governance with README-per-feature,
  repository-aligned technical documentation, and explicit quality gates.
- Modified principles:
  - Clean Code -> Clean Code e simplicidade
  - Test-Driven Development (TDD) -> TDD obrigatorio
  - Technical Documentation -> Documentacao tecnica viva
- Added principles:
  - README atualizado por feature
  - Boas praticas de engenharia
- Added sections:
  - Quality Gates
- Removed sections: none
- Templates requiring updates:
  - .specify/templates/plan-template.md - updated
  - .specify/templates/spec-template.md - updated
  - .specify/templates/tasks-template.md - updated
  - .specify/templates/agent-file-template.md - updated
  - .specify/templates/checklist-template.md - updated
- Runtime guidance updated:
  - README.md - updated
  - CLAUDE.md - updated
- Follow-up TODOs: none
-->

# MounTrack Constitution

## Core Principles

### I. TDD obrigatorio

Toda nova funcionalidade, correcao de bug e alteracao comportamental DEVE seguir
o ciclo Red-Green-Refactor. Nenhum codigo de producao DEVE ser escrito sem um
teste automatizado que descreva o comportamento esperado e falhe antes da
implementacao.

- Red: o teste DEVE ser criado primeiro e sua falha inicial DEVE ser verificavel.
- Green: a implementacao DEVE conter apenas o necessario para o teste passar.
- Refactor: a melhoria estrutural DEVE manter a suite verde durante a alteracao.
- Testes unitarios DEVEM cobrir regras puras, validacoes, casos de borda e
  estados vazios.
- Testes de integracao DEVEM cobrir rotas de API, persistencia, webhooks,
  autenticacao/autorizacao e integracoes externas quando o contrato mudar.
- Testes de UI ou smoke tests DEVEM cobrir fluxos mobile-first criticos quando a
  experiencia do usuario mudar.
- Mocks DEVEM ser usados apenas para isolar limites externos lentos,
  indisponiveis ou cobrados. Contratos internos DEVEM preferir implementacoes
  reais ou fixtures controladas.
- Uma alteracao sem teste automatizado DEVE registrar a justificativa tecnica no
  plano da feature e compensar com verificacao manual documentada.

**Rationale**: TDD transforma comportamento esperado em contrato executavel,
reduz regressao em fluxos sensiveis de saude, billing e autenticacao, e mantem a
base pronta para refatoracoes pequenas e seguras.

### II. Clean Code e simplicidade

Codigo DEVE ser escrito para manutencao por humanos. A solucao mais simples que
preserva correcao, seguranca e testabilidade DEVE vencer alternativas mais
abstratas.

- Nomes DEVEM comunicar intencao de dominio com clareza.
- Funcoes DEVEM ter responsabilidade unica e tamanho suficiente para leitura sem
  navegacao excessiva.
- Modulos DEVEM manter alta coesao e baixo acoplamento.
- Regras de negocio DEVEM ficar separadas de adaptadores, componentes visuais,
  rotas HTTP, jobs e acessos a provedores externos.
- Duplicacao DEVE ser removida quando representar a mesma regra de negocio em
  tres ou mais locais. Menos que isso PODE permanecer explicito para evitar
  abstracao prematura.
- Codigo morto, comentarios obsoletos, imports nao usados e flags temporarias
  sem plano de remocao DEVEM ser removidos.
- Erros DEVEM ser tratados de forma explicita, com propagacao ou log util.
  Capturas silenciosas sao proibidas.
- Tipos TypeScript DEVEM preservar seguranca. Uso de `any` DEVE ser raro,
  localizado e justificado.

**Rationale**: O produto combina UI, dados clinicos/operacionais, billing e
integracoes externas. Codigo simples e coeso reduz custo de mudanca e torna
regressoes mais faceis de detectar.

### III. Documentacao tecnica viva

Documentacao tecnica DEVE evoluir junto com o codigo. Toda decisao, contrato,
procedimento operacional ou integracao que afete manutencao DEVE estar
documentada em `docs/`, `specs/` ou no artefato tecnico mais proximo.

- `docs/` DEVE concentrar orientacoes tecnicas duradouras.
- `specs/` DEVE registrar contexto, plano, contratos, modelo de dados, quickstart
  e tarefas de cada feature planejada pelo Spec Kit.
- Documentacao DEVE ser atualizada no mesmo PR que altera o comportamento,
  contrato, setup, deploy, observabilidade, billing, seguranca ou integracao que
  ela descreve.
- Documentos DEVEM apontar para arquivos fonte e comandos reais em vez de copiar
  listas volateis de dependencias.
- Decisoes de arquitetura com trade-off relevante DEVEM registrar a opcao
  escolhida, alternativas rejeitadas e motivo.
- Documentacao obsoleta DEVE ser corrigida ou removida antes do merge.

**Rationale**: A documentacao e parte do sistema. Quando fica defasada, o time
perde rastreabilidade, opera integracoes sensiveis com risco maior e aumenta o
tempo necessario para novas features.

### IV. README atualizado por feature

`README.md` e o ponto de entrada do projeto e DEVE refletir o estado atual do
produto. Toda nova feature DEVE incluir uma decisao explicita de impacto no
README: atualizar o arquivo quando houver mudanca visivel ou registrar no PR que
nenhuma alteracao e necessaria.

- README.md DEVE ser atualizado quando a feature alterar capacidades do produto,
  fluxos principais, scripts, variaveis de ambiente, setup local, deploy,
  integracoes, arquitetura de alto nivel, prints ou estado atual do projeto.
- O README DEVE linkar para documentacao detalhada em `docs/` quando o assunto
  exigir profundidade tecnica.
- O README NAO DEVE duplicar guias longos, contratos extensos ou runbooks. Ele
  DEVE orientar o leitor para a fonte tecnica correta.
- Cada PR de feature DEVE declarar "README atualizado" ou "README sem alteracao
  necessaria" com justificativa objetiva.

**Rationale**: O README e usado para onboarding, operacao local, demonstracao e
handoff. Mantendo-o sincronizado por feature, o projeto evita divergencia entre o
produto real e sua documentacao de entrada.

### V. Boas praticas de engenharia

Toda alteracao DEVE proteger correcao, seguranca, testabilidade e
manutenibilidade antes de velocidade. Boas praticas sao requisitos de entrega,
nao preferencias opcionais.

- Segredos, tokens e credenciais NAO DEVEM ser commitados.
- Validacao de entrada DEVE existir em limites publicos: rotas, webhooks, forms,
  jobs e scripts operacionais.
- Alteracoes em autenticacao, autorizacao, billing, dados pessoais, webhooks ou
  operacao administrativa DEVEM incluir revisao de seguranca e regressao
  especifica.
- Dependencias novas DEVEM ter proposito claro, manutencao ativa e custo
  justificado contra implementacao local simples.
- APIs e componentes compartilhados DEVEM manter compatibilidade ou registrar
  migracao clara.
- Performance mobile-first DEVE ser preservada em fluxos recorrentes do usuario.
- A branch principal DEVE permanecer buildavel, testavel e apta a deploy.

**Rationale**: MounTrack opera dados e fluxos sensiveis. Boas praticas reduzem
risco de incidentes, melhoram previsibilidade de entrega e preservam confianca no
produto durante evolucao incremental.

## Code Quality Standards

- TypeScript strict mode DEVE permanecer habilitado.
- `npm test` DEVE passar antes de concluir alteracoes relevantes.
- `npm run lint` DEVE passar antes de merge.
- `npm run build` DEVE passar antes de release, deploy ou mudanca em rotas,
  configuracao, dependencias, autenticacao, billing ou integracoes.
- `npm audit --audit-level=high` DEVE ser executado quando dependencias forem
  alteradas; vulnerabilidades altas ou criticas DEVEM ser tratadas ou
  justificadas com mitigacao documentada.
- Rotas de API DEVEM retornar formatos consistentes de sucesso e erro.
- Logs DEVEM apoiar diagnostico sem expor dados sensiveis.
- Refatoracoes DEVEM ser pequenas, cobertas por testes e separadas de mudancas de
  comportamento quando possivel.

## Development Workflow

- Cada feature DEVE iniciar por spec/plan/tasks ou por uma descricao tecnica
  equivalente quando o escopo for pequeno.
- Riscos de arquitetura, seguranca, integracao e manutencao DEVEM ser expostos
  antes da implementacao.
- Tarefas DEVEM ser pequenas e ordenadas para validar uma historia de usuario por
  vez.
- Commits e PRs DEVEM representar mudancas logicas e revisaveis.
- PRs DEVEM incluir resumo, testes executados, impacto em documentacao, impacto
  no README e riscos residuais.
- Revisao de codigo DEVE verificar aderencia a esta constituicao antes de
  aprovacao.
- Violacoes da constituicao DEVEM ser corrigidas antes do merge ou registradas
  como excecao temporaria com dono, motivo e prazo.

## Quality Gates

Cada plano de feature e cada PR DEVEM responder, com evidencias objetivas:

1. Quais testes falharam antes da implementacao?
2. Quais testes e checks passaram apos a implementacao?
3. Quais documentos em `docs/` ou `specs/` foram atualizados?
4. O `README.md` foi atualizado ou a ausencia de impacto foi justificada?
5. Quais riscos de seguranca, dados, billing, autenticacao ou integracao foram
   avaliados?
6. A solucao mantem responsabilidades separadas e evita abstracao prematura?

Uma feature NAO DEVE avancar para implementacao se o plano nao passar nos gates
de TDD, documentacao e riscos. Uma feature NAO DEVE ser concluida se os checks
aplicaveis nao forem executados ou justificados.

## Governance

Esta constituicao e a referencia autoritativa para praticas de desenvolvimento
do MounTrack. Ela prevalece sobre convencoes informais quando houver conflito.

- Amendments: qualquer alteracao nesta constituicao DEVE incluir racional,
  impacto em templates, impacto em docs de orientacao e bump de versao.
- Versionamento: esta constituicao usa semantic versioning.
  - MAJOR: principio removido, redefinido de forma incompatibilizante ou regra de
    governanca quebrada.
  - MINOR: novo principio, nova secao ou expansao material de regra existente.
  - PATCH: ajuste de texto, clareza ou correcao sem mudanca semantica.
- Compliance: todo plano, tarefa, PR e review DEVE verificar aderencia aos
  principios vigentes.
- Excecoes: excecoes DEVEM ser explicitas, temporarias, rastreaveis e aprovadas
  no contexto da feature.
- Orientacao operacional: `README.md`, `docs/`, `CLAUDE.md` e arquivos
  equivalentes de agentes DEVEM apontar para esta constituicao quando tratarem de
  processo de engenharia.

**Version**: 1.1.0 | **Ratified**: 2026-04-06 | **Last Amended**: 2026-04-13
