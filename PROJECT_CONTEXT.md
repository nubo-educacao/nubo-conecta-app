# Project Context: Nubo Conecta App
> Este arquivo é o cérebro local do frontend mobile-first.
> Tanto Antigravity (IDE) quanto Claude (CLI) devem ler este arquivo ao atuar nesta pasta.

## Source of Truth (PRD)
@import ../nubo-ops/docs/prd_novo_app.md

## Technical Stack
- **Framework**: Next.js 16 (App Router)
- **Library**: React 19
- **Styling**: Tailwind CSS 4.0
- **Package Manager**: pnpm
- **State Management**: React Context / Hooks
- **Icons/Components**: [A definir conforme design do Figma]

## Architecture Guidelines
1. **Mobile-First**: Priorizar layouts para telas pequenas (polegares).
2. **Bottom Navigation**: Padrão de navegação inferior obrigatório.
3. **TDD Flow**: Testes Vitest/Playwright obrigatórios antes de qualquer lógica.

## Figma Reference & UI Foundation Map
> **Ação Requerida (Humano):** Por favor, adicione os IDs (Nós do Figma) e links diretos para os seguintes componentes críticos para o lançamento e construção da Foundation (Sprint 1). 
- `[ ]` **Design Tokens Globais:** Cores (Paleta v1), Efeitos (Gradientes, Sombras), Tipografia
@https://www.figma.com/design/u2yvPyuWlcJzHg9SZSm6JC/Prot%C3%B3tipo-Nubo?node-id=32-6814&m=dev
@https://www.figma.com/design/u2yvPyuWlcJzHg9SZSm6JC/Prot%C3%B3tipo-Nubo?node-id=32-7016&m=dev
@https://www.figma.com/design/u2yvPyuWlcJzHg9SZSm6JC/Prot%C3%B3tipo-Nubo?node-id=32-7288&m=dev
@https://www.figma.com/design/u2yvPyuWlcJzHg9SZSm6JC/Prot%C3%B3tipo-Nubo?node-id=32-11266&m=dev
- `[ ]` **Login View (Auth):** Usar @AuthModal.tsx. Não teremos splash, usuário é levado para a Home direto e autenticação é feita via modal.
- `[ ]` **AppShell (Core Navigation):**
  - ToolBar Inferior (Bottom Nav) (Modos ativo/inativo): 
@https://www.figma.com/design/u2yvPyuWlcJzHg9SZSm6JC/Prot%C3%B3tipo-Nubo?node-id=22-1116&m=dev
  - Top Bar (Top Navigation): 
@https://www.figma.com/design/u2yvPyuWlcJzHg9SZSm6JC/Prot%C3%B3tipo-Nubo?node-id=22-1103&m=dev
  - SideBar (Desktop): 
@https://www.figma.com/design/u2yvPyuWlcJzHg9SZSm6JC/Prot%C3%B3tipo-Nubo?node-id=26-525&m=dev

