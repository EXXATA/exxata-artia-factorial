# Workspace First Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganizar o frontend para um shell Workspace First com navegação lateral recolhida, conteúdo principal dominante e painéis contextuais recolhíveis em todas as abas.

**Architecture:** O redesign será aplicado em camadas. Primeiro entram os tokens visuais, a navegação compartilhada e os componentes base de página/contexto; depois as views são adaptadas para reutilizar essa estrutura e mover resumos, ajuda e estados auxiliares para o painel contextual. A lógica de dados e integrações existentes é preservada, priorizando mudança estrutural e visual.

**Tech Stack:** React 18, React Router, Zustand, Tailwind CSS, Vite, Node test runner

---

### Task 1: Add shared navigation/context helpers

**Files:**
- Create: `frontend/src/components/layout/workspaceNavigation.js`
- Create: `frontend/src/components/integration/workedHoursSummary.js`
- Create: `frontend/tests/workspaceLayout.test.js`
- Modify: `frontend/package.json`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run the test to verify it fails**
- [ ] **Step 3: Implement the minimal helpers and test script**
- [ ] **Step 4: Run the test to verify it passes**

### Task 2: Build the shared Workspace First shell

**Files:**
- Create: `frontend/src/components/layout/WorkspaceShell.jsx`
- Create: `frontend/src/components/layout/WorkspaceSidebar.jsx`
- Create: `frontend/src/components/layout/WorkspaceTopbar.jsx`
- Create: `frontend/src/components/layout/WorkspaceHelpPanel.jsx`
- Modify: `frontend/src/components/layout/ProtectedLayout.jsx`
- Modify: `frontend/src/components/layout/Header.jsx`
- Modify: `frontend/src/styles/globals.css`

- [ ] **Step 1: Replace the old top tab header with the new shell structure**
- [ ] **Step 2: Preserve global shortcuts and actions**
- [ ] **Step 3: Add mobile-safe behavior and contextual help panel**
- [ ] **Step 4: Rebuild shared CSS tokens and shell/layout classes**

### Task 3: Create the shared page and context panel components

**Files:**
- Create: `frontend/src/components/layout/WorkspacePage.jsx`
- Create: `frontend/src/components/layout/WorkspaceContextPanel.jsx`
- Modify: `frontend/src/components/integration/WorkedHoursRangePanel.jsx`
- Modify: `frontend/src/styles/globals.css`

- [ ] **Step 1: Create the shared page wrapper with compact toolbar region**
- [ ] **Step 2: Create the contextual side panel with collapsed and expanded states**
- [ ] **Step 3: Refactor the worked-hours summary panel to fit the new contextual role**
- [ ] **Step 4: Verify the base layout works across pages**

### Task 4: Adapt weekly operational views

**Files:**
- Modify: `frontend/src/components/calendar/CalendarView.jsx`
- Modify: `frontend/src/components/gantt/GanttView.jsx`
- Modify: `frontend/src/components/gantt/GanttWeeklyTable.jsx`
- Modify: `frontend/src/components/table/TableView.jsx`
- Modify: `frontend/src/components/table/TableDetailTable.jsx`
- Modify: `frontend/src/components/table/TableSummaryTable.jsx`
- Modify: `frontend/src/styles/globals.css`

- [ ] **Step 1: Move contextual chips, legends and conciliation into the contextual panel**
- [ ] **Step 2: Rebuild the top control rows to keep only essential actions**
- [ ] **Step 3: Expand the content region for calendar, Gantt and tables**
- [ ] **Step 4: Normalize tables and supporting states to the new visual system**

### Task 5: Adapt analytical and directory views

**Files:**
- Modify: `frontend/src/components/charts/ChartsToolbar.jsx`
- Modify: `frontend/src/components/charts/ChartsView.jsx`
- Modify: `frontend/src/components/directory/DirectoryView.jsx`
- Modify: `frontend/src/pages/WorkedHoursComparison.jsx`
- Modify: `frontend/src/components/comparison/ComparisonFilters.jsx`
- Modify: `frontend/src/components/comparison/ComparisonResultsTable.jsx`
- Modify: `frontend/src/components/comparison/ComparisonSidePanel.jsx`
- Modify: `frontend/src/components/comparison/ComparisonSummaryGrid.jsx`

- [ ] **Step 1: Convert comparison summaries and detail panels into contextual content**
- [ ] **Step 2: Reduce dashboard-like clutter in charts and directory**
- [ ] **Step 3: Align toolbar density and section hierarchy with the shared pattern**
- [ ] **Step 4: Refine supporting components to match the new tone**

### Task 6: Align auth screens and verify everything

**Files:**
- Modify: `frontend/src/pages/LoginPage.jsx`
- Modify: `frontend/src/pages/AccessPendingPage.jsx`
- Modify: `frontend/src/pages/AuthCallbackPage.jsx`
- Modify: `frontend/src/store/slices/uiSlice.js`
- Modify: `.gitignore`

- [ ] **Step 1: Bring auth pages into the new visual language**
- [ ] **Step 2: Set safe visual defaults for the new experience**
- [ ] **Step 3: Ignore brainstorm artifacts from the workspace**
- [ ] **Step 4: Run `node --test frontend/tests/*.test.js`**
- [ ] **Step 5: Run `npm --prefix frontend run build`**

## Execution Mode

Inline execution selected by user in the same session.
