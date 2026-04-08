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

## Sprint 02 — O Novo Catálogo (Diretrizes Arquiteturais)
1. **Catálogo Unificado Híbrido**: Em `(app)/opportunities`, os itens do MEC e de Parceiros V2 coexistem via abstração (`IUnifiedOpportunity`). 
2. **Switch "Para Você" / "Explorar Todas"** (label exato do Figma): 
   - *Para Você*: Requer perfil validado. Exibe seção "Seus Matches" seguida de flat list vertical single-column de cards. Ordena via Match Score + Boost de Parceiros B2B.
   - *Explorar Todas*: Catálogo aberto com curadoria pinada gerida pelo `/app-cms` do Admin.
3. **Componentização Semântica (CONFIRMADO pelo Figma — Dois Componentes Distintos)**:
   - `CardOportunidades.tsx` — Card MEC (gradiente teal `#3092BB`, CTA teal, SEM badge topo). Figma: `node 42:1487`.
   - `CardOportunidadeParceira.tsx` — Card Parceiro (gradiente roxo `#7030C2`, CTA roxo `#9747FF`, COM badge "⭐ Oportunidade parceira" roxo no topo). Figma: `node 41:1311`.
   - Ambos compartilham: SVG Nuvem decorativo (exportar do Figma), Chip Warning `#FFB800` de categoria, botão Favoritar (heart), Dimensão `361×277px rounded-[16px]`.
4. **Referências Visuais e Legado (v0)** — *READ-ONLY. Não copiar 1:1. Extrair apenas a lógica de negócio e reimplementar na v1.*:
   - **Componente Principal (Lógica de Referência):** `nubo-hub-app/components/OpportunityCard.tsx`
     - *Lógica a preservar:* `handleFavorite` (optimistic update + pendingAction pós-auth), `handleViewDetails` (pendingAction redirect), cálculo de `cutoffDisplay` (min/max) e `uniqueTypes` (badges de tipo), `shiftsConfig` (turnos ativos via Set).
     - *O que NÃO replicar:* Lógica de `isCompact`, breakpoints `min-[1525px]` (desktop antigo), classes Tailwind hardcoded — tudo isso será redesenhado para o novo layout mobile-first da Sprint 02.
   - **Asset SVG Decorativo (Nuvem):** `nubo-hub-app/public/assets/card-background.svg`
     - ⚠️ Este arquivo deve ser **copiado** para `nubo-conecta-app/public/assets/card-background.svg`. É o `<img src="/assets/card-background.svg">` que ambos os cards (`CardOportunidades` e `CardOportunidadeParceira`) usam como overlay decorativo na borda inferior do header do card (posição `absolute bottom-[-1px]`, `h-[35px]`).
5. **Figma Node Map (Sprint 02)**:
   - Página Completa "Oportunidades - Para Você": `node 22:1153`
@https://www.figma.com/design/u2yvPyuWlcJzHg9SZSm6JC/Prot%C3%B3tipo-Nubo?node-id=22-1153&m=dev
   - Card MEC (Default + Hover): `node 42:1487`
@https://www.figma.com/design/u2yvPyuWlcJzHg9SZSm6JC/Prot%C3%B3tipo-Nubo?node-id=42-1487&m=dev
   - Card Parceiro (Default + Hover): `node 41:1311`
@https://www.figma.com/design/u2yvPyuWlcJzHg9SZSm6JC/Prot%C3%B3tipo-Nubo?node-id=41-1311&m=dev
   - Estrutura Geral / Hub Cards: `node 288:14283`
@https://www.figma.com/design/u2yvPyuWlcJzHg9SZSm6JC/Prot%C3%B3tipo-Nubo?node-id=288-14283&m=dev

6. **Figma Node Map (Sprint 2.5 - Estabilização e Explorar)**:
   - Explorar Todas (View Completa): `node 22:1948`
@https://www.figma.com/design/u2yvPyuWlcJzHg9SZSm6JC/Prot%C3%B3tipo-Nubo?node-id=22-1948&m=dev
   - Explorar Todas (Container Search Bar + Filtros): `node 22:1967`
@https://www.figma.com/design/u2yvPyuWlcJzHg9SZSm6JC/Prot%C3%B3tipo-Nubo?node-id=22-1967&m=dev
   - Explorar Todas (Category Pills): `node 62:1349`
@https://www.figma.com/design/u2yvPyuWlcJzHg9SZSm6JC/Prot%C3%B3tipo-Nubo?node-id=62-1349&m=dev
   - Página de Instituição (View Root): `node 22:1561`
@https://www.figma.com/design/u2yvPyuWlcJzHg9SZSm6JC/Prot%C3%B3tipo-Nubo?node-id=22-1561&m=dev

## Sprint 03 & 3.5 — O Cérebro Unificado & Home Dashboard

1. **Arquitetura Híbrida & Chat FAB**: O Nubo passa a ser guiado pela inteligência da Cloudinha. Componentes como o FAB (ChatDrawer) agora são streamados via NDJSON e consomem diretamente `generate_content_stream`. A UI precisa garantir responsividade na renderização do Markdown.
2. **Onboarding / Match Engine**: A aba "Para Você" exige o preenchimento de perfil do estudante (UserData). Esse preenchimento DEVE ser escrito diretamente nas tabelas (`user_preferences` etc.) usando o Supabase no cliente. Sem mockups. A trigger do Match depende destes dados persistidos.
3. **Fidelidade da Home**: A Home sofreu polimento visual para seguir à risca as grids de Desktop. O limite horizontal no Carrossel de Desktop agora é formatado como `grid-cols-3` sem empilhamento vertical profundo.
4. **Figma Node Map (Sprint 3 e 3.5)**:
   - Header + Busca (Hero Panel Azul com Chips): `node 22:1084`
@https://www.figma.com/design/u2yvPyuWlcJzHg9SZSm6JC/Prot%C3%B3tipo-Nubo?node-id=22-1084&m=dev
   - Seção de Avisos e Datas Importantes: `node 32:13290`
@https://www.figma.com/design/u2yvPyuWlcJzHg9SZSm6JC/Prot%C3%B3tipo-Nubo?node-id=32-13290&m=dev
