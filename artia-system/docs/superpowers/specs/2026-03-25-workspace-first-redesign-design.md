# Workspace First Redesign

**Date:** 2026-03-25

## Goal

Redesenhar a área autenticada do sistema com foco em objetividade, consistência visual e ganho real de área útil, especialmente para o calendário semanal.

## Chosen Direction

Direção aprovada: `Workspace First`

Princípios aprovados no alinhamento:
- navegação principal lateral, recolhida por padrão no desktop e expandindo no hover
- primeira dobra sempre prioriza a área de trabalho principal
- conteúdo contextual nasce recolhido por padrão
- atalhos, ajuda, legendas e instruções saem da superfície principal e vão para painel sob demanda
- linguagem visual corporativa clean, clara e sóbria

## Visual Thesis

Um workspace operacional claro e profissional, com superfícies leves, alto foco no conteúdo ativo, poucas cores de estado e contraste suficiente para leitura densa sem parecer pesado.

## Content Plan

- shell compartilhado: navegação lateral + topo enxuto + ações globais
- faixa de controle: apenas filtros e ações essenciais da visão
- área principal: calendário, tabela, lista ou gráfico como protagonista
- painel contextual: conciliação, ajuda, legendas, estado de sincronização e resumos sob demanda

## Interaction Thesis

- sidebar recolhida com expansão por hover no desktop
- painel contextual lateral recolhível com “peek state” compacto
- transições rápidas e discretas em navegação, expansão e hover para reforçar hierarquia sem ruído

## Information Architecture

### Shared Shell

- substituir a navegação horizontal superior por uma sidebar compacta
- mover o topo global para um header fino com nome da visão atual e ações globais
- centralizar ajuda, atalhos e legenda em um painel próprio
- manter `Atualizar`, `Dados`, `Tema` e `Sair` como ações globais

### Shared Page Pattern

Cada aba passa a seguir a mesma estrutura:

1. faixa curta de filtros e ações
2. conteúdo principal dominante
3. painel contextual recolhível

## Page-Level Changes

### Calendário

- remover a faixa extensa de chips/instruções da área principal
- deixar a grade semanal ocupar praticamente toda a primeira dobra
- mover conciliação, legenda de estados e ajuda de interação para painel contextual lateral
- manter navegação de semana e intervalo como controles principais

### Gantt

- manter navegação de semana e filtro de projeto no topo
- mover legenda e conciliação para o painel contextual
- dar mais largura à tabela semanal

### Tabela

- manter filtros e ação de novo apontamento no topo
- mover explicação de modo detalhado/agregado e conciliação para o painel contextual
- reforçar leitura tabular e seleção

### Gráficos

- manter filtros analíticos no topo
- usar o painel contextual para resumo diário do período e estados auxiliares
- reduzir a sensação de dashboard genérico

### Diretório

- preservar o fluxo mestre-detalhe como área principal
- limpar cartões, contadores e texto repetitivo
- mover resumo contextual e ajuda para o painel lateral

### Comparação

- transformar a tabela de resultados na peça principal
- mover detalhe do dia e resumos por projeto/atividade para o painel contextual
- reduzir banners e grids redundantes no topo

### Auth Pages

- alinhar login, callback e pendência de acesso com a nova linguagem visual
- reduzir aparência genérica de card central simples

## Styling Direction

- manter uma única cor de acento principal
- reduzir uso de múltiplos chips coloridos simultâneos
- substituir “cards por toda parte” por regiões com função clara
- usar tipografia forte para escaneabilidade e leitura densa
- manter modo escuro, mas favorecer clareza estrutural no modo claro

## Testing and Verification

- adicionar testes para helpers compartilhados do novo shell/contexto
- validar build de produção do frontend
- validar testes do frontend via `node --test`
- revisar manualmente as principais visões após a mudança estrutural

## Risks

- regressão de navegação por teclado se os atalhos forem espalhados
- quebra visual em telas menores se a sidebar/context rail não tiver regras móveis claras
- excesso de abstração no shell compartilhado, dificultando ajustes específicos por visão

## Mitigations

- manter atalhos globais no shell principal
- criar componentes compartilhados leves, não um framework rígido demais
- adaptar views mantendo a lógica existente e trocando primeiro o layout e a hierarquia
