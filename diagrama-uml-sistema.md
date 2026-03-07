# Diagrama UML - Sistema de Apontamento de Horas Artia (Versão Antiga)

## 1. Visão Geral do Sistema

O sistema é uma **aplicação web SPA (Single Page Application)** offline-first para registro e gerenciamento de horas trabalhadas, com sincronização Firebase para presença online e armazenamento local via IndexedDB.

---

## 2. Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                     SISTEMA ARTIA - INDEX.HTML                  │
│                    (Aplicação Monolítica SPA)                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
        ┌───────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
        │   Firebase   │ │ IndexedDB │ │ LocalStorage│
        │  (Presença)  │ │ (Eventos) │ │   (Cache)   │
        └──────────────┘ └───────────┘ └─────────────┘
```

---

## 3. Arquitetura de Dados

### 3.1 Modelo de Dados Principal

```javascript
// Estrutura do Evento (Event)
{
  id: String,              // UUID único do evento
  start: String,           // ISO 8601 timestamp (ex: "2026-01-19T08:00:00.000Z")
  end: String,             // ISO 8601 timestamp
  day: String,             // Data no formato "YYYY-MM-DD"
  project: String,         // Número do projeto (ex: "1360")
  activityId: String,      // ID da atividade no Artia
  activityLabel: String,   // Nome da atividade
  artiaLaunched: Boolean,  // Se foi lançado no sistema Artia
  notes: String            // Observações (pode incluir [Local] no início)
}
```

### 3.2 Armazenamento de Dados

```
┌──────────────────────────────────────────────────────────────┐
│                    CAMADAS DE PERSISTÊNCIA                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. IndexedDB (artia_offline_db_v1)                         │
│     ├─ ObjectStore: "events" (keyPath: "id")               │
│     │   └─ Armazena todos os eventos de apontamento        │
│     └─ ObjectStore: "kv" (keyPath: "key")                  │
│         ├─ backupDirectoryHandle                           │
│         ├─ backupFileHandle                                │
│         ├─ backupFolderName                                │
│         └─ exportEmail                                     │
│                                                              │
│  2. LocalStorage                                            │
│     ├─ offline_week_calendar_idbase_index_v1               │
│     │   └─ Índice de IDs Artia por projeto/atividade      │
│     ├─ offline_week_calendar_idbase_meta_v1                │
│     │   └─ Metadados da base de IDs                       │
│     ├─ offline_week_calendar_clipboard_fields_v1           │
│     │   └─ Campos copiados (projeto/atividade/ID/notas)   │
│     ├─ offline_week_calendar_table_range_v1                │
│     │   └─ Período selecionado na visão Tabela            │
│     ├─ offline_week_calendar_charts_range_v1               │
│     │   └─ Período selecionado na visão Gráficos          │
│     ├─ theme (dark/light)                                  │
│     └─ exportEmail                                         │
│                                                              │
│  3. Firebase Realtime Database                              │
│     └─ presence/{sessionId}                                │
│         ├─ state: "online"                                 │
│         └─ lastSeen: timestamp (atualizado a cada 15s)     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Fluxo de Dados - Importação e Exportação

### 4.1 Importação de Base de IDs (XLSX)

```
┌─────────────────────────────────────────────────────────────┐
│  FLUXO: Carregar IDs Artia (XLSX)                          │
└─────────────────────────────────────────────────────────────┘

Usuário clica "Carregar IDs Artia (XLSX)"
    │
    ▼
Seleciona arquivo .xlsx
    │
    ▼
┌───────────────────────────────────────┐
│ readZipEntries(arrayBuffer)           │
│ - Lê estrutura ZIP do XLSX            │
│ - Extrai entradas do arquivo          │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ parseSharedStrings(xml)               │
│ - Lê xl/sharedStrings.xml             │
│ - Extrai strings compartilhadas       │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ parseSheetRows(xml, sharedStrings)    │
│ - Lê xl/worksheets/sheet1.xml         │
│ - Extrai colunas A, B, C              │
│   A = Nome da Atividade               │
│   B = ID Artia                        │
│   C = Projeto + Nome do Projeto       │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ Processa e indexa dados               │
│ - extractProjectFromC(valC)           │
│ - extractProjectLabelFromC(valC)      │
│ - isLikelyProjectNameActivity()       │
│   (filtra pseudo-atividades)          │
│ - Cria chave: "projeto||atividade"    │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ saveIdBaseToStorage(index, meta)      │
│ - Salva em LocalStorage               │
│ - Atualiza status da base             │
└───────────────────────────────────────┘
```

### 4.2 Importação de Apontamentos (XLSX)

```
┌─────────────────────────────────────────────────────────────┐
│  FLUXO: Importar Apontamentos (XLSX)                       │
└─────────────────────────────────────────────────────────────┘

Usuário clica "Importar Apontamentos (XLSX)"
    │
    ▼
Seleciona arquivo .xlsx
    │
    ▼
Confirma: Substituir tudo OU Mesclar
    │
    ▼
┌───────────────────────────────────────┐
│ findWorksheetPathByName(zip, "atividades") │
│ - Lê xl/workbook.xml                  │
│ - Lê xl/_rels/workbook.xml.rels       │
│ - Encontra aba "atividades"           │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ parseSheetRowsAny(xml, shared)        │
│ - Lê todas as colunas da planilha     │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ findHeaderMapping(rows)               │
│ - Identifica linha de cabeçalho       │
│ - Mapeia colunas:                     │
│   • Data                              │
│   • Projeto                           │
│   • Hora Início                       │
│   • Hora de Término                   │
│   • Atividade                         │
│   • Observação                        │
│   • Lançamento Artia                  │
│   • ID                                │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ buildEventsFromRows(rows, headerIdx, colMap) │
│ - Converte linhas em objetos Event    │
│ - Valida datas e horários             │
│ - Gera IDs únicos                     │
└───────────────┬───────────────────────┘
                │
                ▼
Se "Substituir": state.events = imported
Se "Mesclar": adiciona sem duplicar
    │
    ▼
saveEvents() → IndexedDB
    │
    ▼
renderAll()
```

### 4.3 Exportação CSV

```
┌─────────────────────────────────────────────────────────────┐
│  FLUXO: Exportar CSV                                        │
└─────────────────────────────────────────────────────────────┘

Usuário clica "Exportar CSV"
    │
    ├─ Exportar Tudo
    │   │
    │   ▼
    │   Todos os eventos ordenados por data
    │
    └─ Exportar Tabela com Filtros
        │
        ▼
        getFilteredTableEvents()
        - Aplica filtros de data
        - Aplica filtros de projeto
        - Aplica filtros de atividade
    │
    ▼
┌───────────────────────────────────────┐
│ downloadCsvRows(events)               │
│                                       │
│ Colunas (separador ";"):             │
│ 1. Data (DD/MM/YYYY)                 │
│ 2. Projeto                           │
│ 3. Hora Início (HH:MM)               │
│ 4. Hora de Término (HH:MM)           │
│ 5. Esforço (HH:MM)                   │
│ 6. Esforço Dia (HH:MM)               │
│ 7. Atividade                         │
│ 8. Observação                        │
│ 9. Artia (Sim/vazio)                 │
│ 10. ID da Atividade                  │
│ 11. E-mail                           │
│                                       │
│ - Adiciona BOM UTF-8 (\uFEFF)        │
│ - Escapa valores com csvEscape()     │
└───────────────┬───────────────────────┘
                │
                ▼
Download: apontamento_horas.csv
```

### 4.4 Backup Automático XLSX

```
┌─────────────────────────────────────────────────────────────┐
│  FLUXO: Backup Automático XLSX                              │
└─────────────────────────────────────────────────────────────┘

Evento dispara backup:
├─ saveEvents() → markBackupDirty()
├─ window.pagehide
└─ document.visibilitychange (hidden)
    │
    ▼
Debounce 2.5s
    │
    ▼
┌───────────────────────────────────────┐
│ buildBackupXlsxBytes()                │
│                                       │
│ Aba 1: "atividades"                  │
│ - Data, Projeto, Hora Início,        │
│   Hora de Término, Esforço,          │
│   Atividade, Observação,             │
│   Lançamento Artia, ID               │
│                                       │
│ Aba 2: "Meta"                        │
│ - Gerado em, Eventos, Arquivo Base   │
│                                       │
│ Gera ZIP com estrutura XLSX:         │
│ - [Content_Types].xml                │
│ - _rels/.rels                        │
│ - xl/workbook.xml                    │
│ - xl/_rels/workbook.xml.rels         │
│ - xl/styles.xml                      │
│ - xl/worksheets/sheet1.xml           │
│ - xl/worksheets/sheet2.xml           │
└───────────────┬───────────────────────┘
                │
                ▼
Tem FileSystemHandle configurado?
    │
    ├─ SIM: writeBackupViaHandle()
    │   └─ Sobrescreve arquivo existente
    │
    └─ NÃO: downloadBackupFallback()
        └─ Download: backup_artia.xlsx
    │
    ▼
updateSaveInfoUI()
flashSaveButton()
```

---

## 5. Visões do Sistema

### 5.1 Visão Calendário (Calendar)

```
┌─────────────────────────────────────────────────────────────┐
│  VISÃO CALENDÁRIO - Componentes                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┐
│ daysHeader (sticky)                 │
│ ┌─────────┬─────────┬─────────┐    │
│ │Horários │Segunda  │Terça... │    │
│ │         │DD/MM    │DD/MM    │    │
│ │         │Hoje     │         │    │
│ │         │Tempo: Xh│Tempo: Xh│    │
│ └─────────┴─────────┴─────────┘    │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ weekGrid                            │
│ ┌──────┬──────┬──────┬──────┐      │
│ │00:00 │      │      │      │      │
│ │01:00 │      │      │      │      │
│ │...   │[────]│      │      │      │ ← Eventos
│ │08:00 │[Proj]│      │      │      │
│ │09:00 │[1360]│      │      │      │
│ │...   │[────]│      │      │      │
│ │──────│──────│──────│──────│      │ ← Linha "now-line"
│ │23:00 │      │      │      │      │   (horário atual)
│ └──────┴──────┴──────┴──────┘      │
└─────────────────────────────────────┘

Interações:
- Click vazio: Inicia seleção (drag)
- Drag: Cria bloco de seleção
- Release: Abre modal de criação
- Click em evento: Abre modal de edição
- Drag em evento: Move/redimensiona
  - Borda superior: Redimensiona início
  - Borda inferior: Redimensiona fim
  - Centro: Move evento completo
```

**Horários:**
- Início: 00:00 (CONFIG.startHour)
- Fim: 24:00 (CONFIG.endHour)
- Intervalo: 10 minutos (CONFIG.stepMinutes)
- Total de slots: 144 (24h × 6 slots/hora)

**Marcador de Horário Atual:**
- Linha vermelha horizontal (now-line)
- Atualizada a cada 1 minuto
- Apenas visível na semana atual
- Posicionada dinamicamente via yFromMinutes()

### 5.2 Visão Tabela (Table)

```
┌─────────────────────────────────────────────────────────────┐
│  VISÃO TABELA - Estrutura                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Filtros:                            │
│ De: [____] Até: [____]              │
│ Projeto: [Todos▼] Atividade: [▼]   │
│                    [+ Novo]         │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ Tabela (sticky header, scrollable body)                    │
├────┬────────┬──────┬──────┬────────┬────────┬─────────┬───┤
│Data│Projeto │Início│Fim   │Esforço │Esf.Dia │Atividade│...│
├────┼────────┼──────┼──────┼────────┼────────┼─────────┼───┤
│... │Proj 1360│08:00│09:30 │01:30   │08:00   │Reunião  │ ✓ │
│... │Proj 1370│10:00│12:00 │02:00   │08:00   │Análise  │   │
├────┴────────┴──────┴──────┴────────┴────────┴─────────┴───┤
│                     Total de Horas: 03:30                  │
└─────────────────────────────────────────────────────────────┘

Colunas ordenáveis (click no cabeçalho):
- Data, Projeto, Hora Início, Hora de Término
- Esforço, Esforço Dia, Atividade, Observação
- Lançamento Artia, ID

Indicadores de ordenação: ▲ (asc) / ▼ (desc)
```

### 5.3 Visão Gantt (Project Timeline)

```
┌─────────────────────────────────────────────────────────────┐
│  VISÃO GANTT - Layout                                       │
└─────────────────────────────────────────────────────────────┘

Filtro: Projeto: [Todos▼]

┌────────┬──────┬───┬───┬───┬───┬───┬───┬───┐
│Projeto │Total │Seg│Ter│Qua│Qui│Sex│Sáb│Dom│
│        │Semana│   │   │   │   │   │   │   │
├────────┼──────┼───┼───┼───┼───┼───┼───┼───┤
│Proj    │      │   │   │   │   │   │   │   │
│1360    │40:00 │8h │8h │8h │8h │8h │   │   │
├────────┼──────┼───┼───┼───┼───┼───┼───┼───┤
│Proj    │      │   │   │   │   │   │   │   │
│1370    │20:00 │4h │4h │4h │4h │4h │   │   │
└────────┴──────┴───┴───┴───┴───┴───┴───┴───┘

Células com horas (.gCell.on):
- Fundo destacado
- Valor em chip arredondado
- Soma automática por dia e por projeto
```

### 5.4 Visão Gráficos (Charts)

```
┌─────────────────────────────────────────────────────────────┐
│  VISÃO GRÁFICOS - Componentes                               │
└─────────────────────────────────────────────────────────────┘

Controles:
Período: [____] → [____]
Projeto: [Todos▼]
Agrupar por: [Meses▼] / [Semanas]

┌─────────────────────────────────────┐
│ Gráfico 1: Horas (ao Longo do Tempo)│
│ ┌─────────────────────────────────┐ │
│ │ Barras: Horas por período       │ │
│ │ Linha: Horas acumuladas         │ │
│ │                                 │ │
│ │  ▂▅█▇▃▂                         │ │
│ │ ╱                               │ │
│ │╱                                │ │
│ └─────────────────────────────────┘ │
│   Jan  Fev  Mar  Abr  Mai  Jun     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Gráfico 2: Projetos (Distribuição)  │
│ ┌─────────────────────────────────┐ │
│ │ Barras horizontais por projeto  │ │
│ │                                 │ │
│ │ Proj 1360 ████████████ 120h    │ │
│ │ Proj 1370 ████████ 80h         │ │
│ │ Proj 1380 ████ 40h             │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘

Biblioteca: Chart.js
Plugins customizados:
- chartHoverBandPlugin (banda de destaque ao hover)
- Tooltip externo customizado
```

### 5.5 Visão Diretório (Directory)

```
┌─────────────────────────────────────────────────────────────┐
│  VISÃO DIRETÓRIO - Base de IDs                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🔍 Buscar...  [↑ Crescente]         │
└─────────────────────────────────────┘

┌──────────────┬──────────────────────────────────┐
│  PROJETOS    │  ATIVIDADES                      │
├──────────────┼──────────────────────────────────┤
│ Projeto 1360 │  Projeto 1360 — 15 atividade(s) │
│      (15)    │                                  │
│ Projeto 1370 │  1.1 - Organização de Documentos │
│      (12)    │  ID: AT-001                      │
│ Projeto 1380 │                                  │
│      (8)     │  2.1 - Reuniões com Cliente      │
│              │  ID: AT-002                      │
│              │                                  │
│              │  3.1 - Levantamento de RDO       │
│              │  ID: AT-003                      │
│              │  ...                             │
└──────────────┴──────────────────────────────────┘

Funcionalidades:
- Busca por número de projeto ou nome de atividade
- Ordenação crescente/decrescente
- Click em projeto: exibe atividades
- Filtra pseudo-atividades (nome do projeto)
```

---

## 6. Modal de Evento

```
┌─────────────────────────────────────────────────────────────┐
│  MODAL DE CRIAÇÃO/EDIÇÃO DE EVENTO                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Novo evento / Editar evento    [✕]  │
│ Data: [____] 08:00 → 09:30          │
│ [Copiar] [Colar]                    │
├─────────────────────────────────────┤
│ Início: [08:00▼]  Fim: [09:30▼]    │
│ (intervalos de 10 minutos)          │
│                                     │
│ Projeto: [1360_____________]        │
│                                     │
│ Atividade: [Reunião________]        │
│ (autocomplete com datalist)         │
│                                     │
│ ID Artia: [AT-001__________]        │
│ ⚠ ID: preencha manualmente          │
│ (ou ✓ ID encontrado na base)        │
│                                     │
│ ☐ Lançamento Artia                  │
│                                     │
│ Local de trabalho:                  │
│ [Escritorio] [Casa] [Cliente]       │
│                                     │
│ Observação:                         │
│ [_________________________]         │
│ [_________________________]         │
│                                     │
├─────────────────────────────────────┤
│ ⚠ Mensagem de validação             │
│         [Apagar] [Cancelar] [Salvar]│
└─────────────────────────────────────┘

Validações:
- Projeto obrigatório
- Duração > 0
- Sem sobreposição com eventos existentes
- ID Artia opcional (mas recomendado)

Auto-preenchimento de ID:
- Busca em state.idBaseIndex
- Chave: normKey(projeto) + "||" + normKey(atividade)
- Atualiza status: warn/ok
```

---

## 7. Fluxo de Interação do Usuário

### 7.1 Criar Novo Evento

```
Usuário arrasta na grade do calendário
    │
    ▼
Cria selectionBlock visual
    │
    ▼
Ao soltar: openCreateModalFromSelection()
    │
    ▼
Modal abre com:
- Data e horários pré-preenchidos
- Campos vazios
    │
    ▼
Usuário preenche:
- Projeto (ex: 1360)
- Atividade (ex: "Reunião")
    │
    ▼
Sistema busca ID automaticamente
maybeAutoFillId()
    │
    ▼
Usuário clica [Salvar]
    │
    ▼
onSave() valida:
- Projeto preenchido
- Duração > 0
- Sem conflitos
    │
    ▼
state.events.push(newEvent)
saveEvents() → IndexedDB
markBackupDirty() → Agenda backup
    │
    ▼
renderAll() atualiza todas as visões
```

### 7.2 Editar Evento Existente

```
Usuário clica em evento no calendário/tabela
    │
    ▼
openEditModal(eventId)
    │
    ▼
Modal abre com dados preenchidos
btnDelete visível
    │
    ▼
Usuário modifica campos
    │
    ▼
Clica [Salvar] ou [Apagar]
    │
    ├─ [Salvar]: Atualiza evento em state.events
    │   └─ saveEvents() → IndexedDB
    │
    └─ [Apagar]: Remove de state.events
        └─ saveEvents() → IndexedDB
    │
    ▼
renderAll()
```

### 7.3 Mover/Redimensionar Evento (Drag)

```
Usuário pressiona mouse em evento
    │
    ▼
beginEventPending()
- Detecta modo: move/resize-top/resize-bottom
- Armazena posição original
    │
    ▼
Usuário move mouse (> 3px)
    │
    ▼
activateEventDrag()
- Cria eventGhost na posição original
- Adiciona classe .dragging
    │
    ▼
onEventDragMove()
- Atualiza posição/tamanho visual
- Permite mudar de dia (move)
- Normaliza para intervalos de 10min
    │
    ▼
Usuário solta mouse
    │
    ▼
onEventDragEnd()
    │
    ├─ Valida:
    │   - Duração > 0
    │   - Sem conflitos
    │   - Confirma mudança de data
    │
    ├─ Se OK: Atualiza evento
    │   └─ saveEvents()
    │
    └─ Se CANCEL: Reverte posição
    │
    ▼
renderAll()
```

---

## 8. Navegação e Atalhos

### 8.1 Navegação de Semanas

```
┌─────────────────────────────────────┐
│ [‹ Sem. anterior] [Hoje] [Prox. ›] │
│      DD/MM/YYYY → DD/MM/YYYY        │
└─────────────────────────────────────┘

Comportamento por visão:
- Calendar: Muda state.weekStart
- Table: Ajusta filtros de data (7 dias)
- Charts: Ajusta período (7 dias)
- Gantt: Mantém semana atual
- Directory: Sem navegação de período
```

### 8.2 Atalhos de Teclado

```
C → Visão Calendário
T → Visão Tabela
G → Visão Gantt
R → Visão Gráficos (chaRts)
D → Visão Diretório

ESC → Fecha modal/menu
Ctrl+Enter → Salva evento (no modal)
```

---

## 9. Sincronização e Presença Online

```
┌─────────────────────────────────────────────────────────────┐
│  FIREBASE REALTIME DATABASE - Presença                      │
└─────────────────────────────────────────────────────────────┘

Ao carregar página:
    │
    ▼
sessionId = crypto.randomUUID()
    │
    ▼
goOnline()
- set(presence/{sessionId}, {state: "online", lastSeen: now})
- onDisconnect(meRef).remove()
    │
    ▼
Heartbeat a cada 15s
- update(meRef, {lastSeen: now})
    │
    ▼
onValue(presence)
- Conta sessões com lastSeen < 60s
- Atualiza badge: "🟢 X online"

┌─────────────────────────────────────┐
│ Badge fixo (canto inferior direito) │
│ 🟢 3 online                         │
└─────────────────────────────────────┘
```

---

## 10. Temas (Claro/Escuro)

```
┌─────────────────────────────────────┐
│ Botão: ☀ / 🌙                       │
└─────────────────────────────────────┘

Tema Escuro (padrão):
- --bg: #121212
- --panel: #1e1e1e
- --text: #e0e0e0
- --accent: #0078d4

Tema Claro:
- --bg: #f7f9fb
- --panel: #ffffff
- --text: #1e1e1e
- --accent: #0078d4

Persistência: localStorage.theme
Aplicação: html.classList.toggle('light')

Ao trocar tema:
- Atualiza CSS variables
- Re-renderiza gráficos (Chart.js)
- Atualiza ícone do botão
```

---

## 11. Funções Auxiliares Principais

### 11.1 Manipulação de Datas/Horários

```javascript
// Conversão e formatação
toDateOnlyISO(date)           // → "2026-01-19"
formatDateBR(date)            // → "19/01/2026"
formatTimeFromMinutes(mins)   // → "08:30" ou "24:00"
pad2(n)                       // → "08"

// Cálculos
startOfWeekMonday(date)       // → Date (segunda-feira)
addDays(date, days)           // → Date
durationMinutes(start, end)   // → Number (minutos)
minutesFromDayStart(dt, iso)  // → Number

// Normalização
clampMinutesToDay(m)          // → 0-1440
normalizeToStepMinutes(m)     // → múltiplo de 10
```

### 11.2 Armazenamento

```javascript
// IndexedDB
openDB()                      // → Promise<IDBDatabase>
kvGet(key)                    // → Promise<value>
kvSet(key, value)             // → Promise<boolean>
loadEventsFromDB()            // → Promise<boolean>
saveEventsToDB()              // → Promise<void>

// LocalStorage
loadIdBaseFromStorage()       // → Promise<void>
saveIdBaseToStorage(idx, meta) // → Promise<void>
storeDateRange(key, start, end)
loadDateRange(key)            // → {start, end}
```

### 11.3 Validação e Busca

```javascript
overlapsExistingMinutes(day, start, end, ignoreId)
  // → Boolean (verifica conflitos)

maybeAutoFillId()
  // Busca ID em state.idBaseIndex
  // Chave: normKey(projeto) + "||" + normKey(atividade)

normKey(s)
  // Normaliza: lowercase, trim, espaços únicos

extractProjectFromC(val)      // → "1360"
extractProjectLabelFromC(val) // → "CONCREJATO x RIO+"
isLikelyProjectNameActivity() // → Boolean
```

---

## 12. Diagrama de Sequência - Criar Evento

```
Usuário    Grade    Modal    State    IndexedDB    Backup
   │         │        │        │          │          │
   │─drag───>│        │        │          │          │
   │         │        │        │          │          │
   │<─visual─┤        │        │          │          │
   │         │        │        │          │          │
   │─release>│        │        │          │          │
   │         │        │        │          │          │
   │         │─open──>│        │          │          │
   │         │        │        │          │          │
   │<────────┴────────┤        │          │          │
   │                  │        │          │          │
   │─preenche────────>│        │          │          │
   │                  │        │          │          │
   │                  │─busca─>│          │          │
   │                  │  ID    │          │          │
   │                  │        │          │          │
   │─[Salvar]────────>│        │          │          │
   │                  │        │          │          │
   │                  │─valida>│          │          │
   │                  │        │          │          │
   │                  │        │─push────>│          │
   │                  │        │  event   │          │
   │                  │        │          │          │
   │                  │        │─save────>│          │
   │                  │        │          │          │
   │                  │        │          │─write───>│
   │                  │        │          │          │
   │                  │        │─dirty───────────────>│
   │                  │        │          │          │
   │                  │<─close─┤          │          │
   │                  │        │          │          │
   │<─────────────────┴────────┤          │          │
   │  renderAll()              │          │          │
   │                           │          │          │
   │                           │          │  (2.5s)  │
   │                           │          │          │
   │                           │          │<─backup──┤
   │                           │          │  XLSX    │
```

---

## 13. Estrutura de Arquivos Gerados

### 13.1 Backup XLSX

```
backup_artia.xlsx (ZIP)
├─ [Content_Types].xml
├─ _rels/
│  └─ .rels
└─ xl/
   ├─ workbook.xml
   ├─ styles.xml
   ├─ _rels/
   │  └─ workbook.xml.rels
   └─ worksheets/
      ├─ sheet1.xml (atividades)
      └─ sheet2.xml (Meta)

Aba "atividades":
- Data | Projeto | Hora Início | Hora de Término
- Esforço | Atividade | Observação
- Lançamento Artia | ID

Aba "Meta":
- Gerado em | Eventos | Arquivo Base
```

### 13.2 CSV Exportado

```
apontamento_horas.csv (UTF-8 + BOM, separador ";")

Data;Projeto;Hora Início;Hora de Término;Esforço;Esforço Dia;Atividade;Observação;Artia;ID da Atividade;E-mail
19/01/2026;1360;08:00;09:30;01:30;08:00;Reunião;Reunião com cliente;Sim;AT-001;usuario@exxata.com.br
...
```

---

## 14. Configurações e Constantes

```javascript
CONFIG = {
  startHour: 0,      // Início do calendário (00:00)
  endHour: 24,       // Fim do calendário (24:00)
  stepMinutes: 10    // Intervalo de slots (10 min)
}

DAY_NAMES = [
  "Segunda", "Terça", "Quarta", "Quinta",
  "Sexta", "Sábado", "Domingo"
]

ACTIVITY_NAMES = [
  "1.1 - Organização de Documentos",
  "1.2 - Anexos",
  "1.3 - Digitalizar Documentos",
  // ... 40+ atividades predefinidas
]

LOCATIONS = ["Escritorio", "Casa", "Cliente"]
```

---

## 15. Responsividade e Adaptações

```
Desktop (> 760px):
- Header em 3 linhas
- Grade completa visível
- Tabela com todas as colunas

Mobile (≤ 760px):
- Header empilhado (1 coluna)
- Scroll horizontal na tabela
- Botões reduzidos
- min-width: 940px nas tabelas
```

---

## 16. Diagrama de Estados da Aplicação

```
┌─────────────────────────────────────┐
│         STATE GLOBAL                │
├─────────────────────────────────────┤
│ weekStart: Date                     │
│ view: "calendar" | "table" |        │
│       "gantt" | "charts" |          │
│       "directory"                   │
│ events: Event[]                     │
│ selection: {dayIso, start, end}     │
│ editingEventId: String | null       │
│ idBaseIndex: Object                 │
│ idBaseMeta: Object                  │
└─────────────────────────────────────┘

Transições de View:
calendar ←→ table ←→ gantt ←→ charts ←→ directory
    ↑                                      ↓
    └──────────────────────────────────────┘
```

---

## 17. Resumo de Responsabilidades

| Componente | Responsabilidade |
|------------|------------------|
| **Firebase** | Sincronização de presença online (heartbeat 15s) |
| **IndexedDB** | Armazenamento principal de eventos e configurações |
| **LocalStorage** | Cache de índice de IDs, filtros, tema |
| **Modal** | Criação/edição de eventos com validação |
| **Calendar View** | Visualização semanal com drag&drop |
| **Table View** | Lista filtrada e ordenável de eventos |
| **Gantt View** | Resumo por projeto e dia |
| **Charts View** | Análise temporal e distribuição (Chart.js) |
| **Directory View** | Consulta de base de IDs Artia |
| **XLSX Import** | Leitura de planilhas (ZIP + XML parsing) |
| **XLSX Export** | Geração de backup (ZIP + XML manual) |
| **CSV Export** | Exportação compatível com Excel pt-BR |

---

## 18. Fluxo Completo de Dados

```
┌─────────────────────────────────────────────────────────────┐
│                    CICLO DE VIDA DOS DADOS                  │
└─────────────────────────────────────────────────────────────┘

1. INICIALIZAÇÃO
   ├─ loadEventsFromDB() → state.events
   ├─ loadIdBaseFromStorage() → state.idBaseIndex
   └─ renderAll()

2. INTERAÇÃO DO USUÁRIO
   ├─ Criar/Editar/Apagar evento
   │  └─ Modifica state.events
   │
   ├─ Importar XLSX
   │  └─ Adiciona/substitui state.events
   │
   └─ Carregar base de IDs
      └─ Atualiza state.idBaseIndex

3. PERSISTÊNCIA
   ├─ saveEventsToDB()
   │  ├─ Grava em IndexedDB
   │  └─ markBackupDirty()
   │
   └─ saveIdBaseToStorage()
      └─ Grava em LocalStorage

4. BACKUP AUTOMÁTICO (debounce 2.5s)
   ├─ buildBackupXlsxBytes()
   ├─ writeBackupViaHandle() ou
   └─ downloadBackupFallback()

5. EXPORTAÇÃO MANUAL
   ├─ CSV: downloadCsvRows()
   └─ XLSX: exportBackupXLSX({reason: "manual"})

6. RENDERIZAÇÃO
   └─ renderAll()
      ├─ renderHeader()
      ├─ renderGrid() + renderEvents() (calendar)
      ├─ renderTable() (table)
      ├─ renderGantt() (gantt)
      ├─ renderCharts() (charts)
      └─ renderDirectory() (directory)
```

---

## 19. Observações Finais

### Pontos Fortes:
- ✅ Sistema 100% offline-first
- ✅ Backup automático com debounce
- ✅ Importação/exportação XLSX sem bibliotecas externas
- ✅ Drag&drop fluido com validações
- ✅ Múltiplas visões sincronizadas
- ✅ Auto-preenchimento de IDs
- ✅ Presença online em tempo real

### Limitações:
- ⚠️ Arquivo monolítico (7384 linhas)
- ⚠️ Sem sincronização de dados entre dispositivos
- ⚠️ Firebase usado apenas para presença
- ⚠️ Sem autenticação de usuários
- ⚠️ Sem versionamento de eventos

### Tecnologias:
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Armazenamento**: IndexedDB, LocalStorage
- **Sincronização**: Firebase Realtime Database
- **Gráficos**: Chart.js
- **Formato**: XLSX (ZIP + XML manual), CSV (UTF-8 + BOM)

---

**Gerado em:** 2026-03-06  
**Versão do Sistema:** index.html (versão antiga monolítica)  
**Total de Linhas:** 7.384
