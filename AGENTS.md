# MounTrack Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-13

## Active Technologies

- TypeScript 5 com strict mode + Next.js 16.1.6 App Router, React 19.2.3, Tailwind CSS 3.4.19, DaisyUI 4.12.24, Zod 4.3.6, pg (005-nutrition-recent-copy)

## Project Structure

```text
src/
├── app/                 # App Router pages and API routes
├── components/          # React UI components
├── contexts/            # React contexts
└── modules/             # Domain modules, services, repositories, hooks

docs/                    # Durable technical documentation
specs/                   # Spec Kit feature artifacts
scripts/                 # Operational scripts
supabase/                # Database/supporting Supabase assets
```

## Commands

npm test; npm run lint; npm run build

## Constitution Gates

Siga `.specify/memory/constitution.md`: escreva testes falhando antes da
implementação, mantenha documentação técnica em `docs/` ou `specs/`, atualize
`README.md` a cada impacto de feature e rode os checks relevantes antes de
concluir o trabalho.

## Code Style

TypeScript 5 com strict mode: Follow standard conventions

## Recent Changes

- 005-nutrition-recent-copy: Added TypeScript 5 com strict mode + Next.js 16.1.6 App Router, React 19.2.3, Tailwind CSS 3.4.19, DaisyUI 4.12.24, Zod 4.3.6, pg

<!-- MANUAL ADDITIONS START -->
## Akita Mode

- Atue em pair programming disciplinado.
- Antes de implementar, leia o contexto do projeto, exponha riscos e use plano
  curto quando a tarefa for ampla.
- Trabalhe em mudanças pequenas, simples, coesas e com baixo acoplamento.
- Preserve compatibilidade com o que já existe.
- Atualize testes junto com o código e valide antes de concluir.
- Não deixe código quebrado aguardando correção futura.
- Priorize correção, simplicidade, segurança, testabilidade, manutenibilidade e
  depois velocidade.

<!-- MANUAL ADDITIONS END -->
