# Arquitetura Simplificada - Sistema Artia

## 🎯 Visão Geral

Sistema de apontamento de horas **100% client-side** que:
- Consulta API Artia para projetos/atividades
- Armazena eventos localmente (navegador)
- Exporta dados quando necessário
- **Sem backend próprio**
- **Sem banco de dados**

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────┐
│         Navegador do Usuário            │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │   React App (Vercel Static)       │ │
│  │                                   │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │  Componentes React          │ │ │
│  │  │  - Calendar View            │ │ │
│  │  │  - Gantt View               │ │ │
│  │  │  - Table View               │ │ │
│  │  │  - Charts View              │ │ │
│  │  │  - Directory View           │ │ │
│  │  └─────────────────────────────┘ │ │
│  │                                   │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │  Services                   │ │ │
│  │  │  - Artia API Client         │ │ │
│  │  │  - Local Cache              │ │ │
│  │  │  - Export (CSV/XLSX)        │ │ │
│  │  └─────────────────────────────┘ │ │
│  │                                   │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │  Storage (Browser)          │ │ │
│  │  │  - localStorage             │ │ │
│  │  │  - IndexedDB (opcional)     │ │ │
│  │  └─────────────────────────────┘ │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
           │                    │
           │ API Calls          │ Exports
           ▼                    ▼
    ┌─────────────┐      ┌──────────────┐
    │  API Artia  │      │ Arquivos     │
    │  (Externo)  │      │ CSV/XLSX     │
    └─────────────┘      └──────────────┘
```

## 📦 Componentes

### 1. Frontend (React + Vite)

**Responsabilidades:**
- Interface do usuário
- Gerenciamento de estado (Zustand)
- Cache de dados (React Query)
- Exportação de arquivos

**Deploy:**
- Vercel (site estático)
- Build: `npm run build`
- Output: `dist/`

### 2. Artia API Client

**Responsabilidades:**
- Consultar projetos da API Artia
- Consultar atividades da API Artia
- Buscar IDs Artia
- Cache de respostas

**Endpoints Artia:**
```javascript
GET /projects              // Lista todos os projetos
GET /projects/{id}         // Projeto específico
GET /projects/{id}/activities  // Atividades do projeto
GET /activities/{id}       // Atividade específica
GET /projects/search?q=    // Busca projetos
```

### 3. Local Storage

**Armazenamento:**
```javascript
{
  // Cache de projetos (24h)
  artia_projects_cache: [...],
  
  // Cache de atividades por projeto (24h)
  artia_activities_cache_123: [...],
  
  // Eventos locais (persistente até exportar)
  artia_events_local: [
    {
      id: "ev_123",
      day: "2024-01-01",
      start: "2024-01-01T09:00:00Z",
      end: "2024-01-01T10:00:00Z",
      projectId: "proj_123",
      projectName: "Projeto X",
      activityId: "act_456",
      activityName: "Desenvolvimento",
      artiaId: "12345",
      notes: "Implementação feature Y",
      artiaLaunched: false
    }
  ],
  
  // Última sincronização com API Artia
  artia_last_sync: "1234567890"
}
```

### 4. Export Service

**Formatos:**
- **CSV**: Para importação em outras ferramentas
- **XLSX**: Backup completo com metadados

**Processo:**
1. Usuário clica em "Exportar"
2. Lê eventos do localStorage
3. Gera arquivo (CSV ou XLSX)
4. Download automático
5. Opcional: Limpar eventos após exportar

## 🔄 Fluxo de Dados

### Inicialização
```
1. Usuário acessa app
2. App carrega do localStorage:
   - Eventos locais
   - Cache de projetos (se válido)
3. Se cache inválido ou vazio:
   - Consulta API Artia
   - Salva no cache
```

### Criar Evento
```
1. Usuário preenche formulário
2. Seleciona projeto (do cache)
3. Seleciona atividade (do cache)
4. ID Artia preenchido automaticamente
5. Salva no localStorage
6. Atualiza UI
```

### Exportar Dados
```
1. Usuário clica "Exportar CSV/XLSX"
2. Lê eventos do localStorage
3. Gera arquivo
4. Download automático
5. Pergunta: "Limpar eventos locais?"
```

### Sincronizar Projetos
```
1. Usuário clica "Atualizar Projetos"
2. Consulta API Artia
3. Atualiza cache
4. Atualiza UI
```

## 🚀 Deploy

### Vercel (Frontend Estático)

**Configuração:**
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

**Variáveis de Ambiente:**
```env
VITE_ARTIA_API_URL=https://api.artia.com
VITE_ARTIA_API_TOKEN=seu-token-artia
```

**Deploy:**
```bash
cd frontend
vercel --prod
```

**Resultado:**
- URL: `https://artia-app.vercel.app`
- 100% estático
- Sem custo de backend
- Sem banco de dados

## 💾 Persistência

### O Que É Armazenado Localmente

**Permanente (até limpar):**
- ✅ Eventos/apontamentos criados pelo usuário
- ✅ Configurações de tema (dark/light)
- ✅ Preferências de visualização

**Cache (24 horas):**
- ⏱️ Lista de projetos da API Artia
- ⏱️ Lista de atividades por projeto
- ⏱️ IDs Artia

**Não Armazenado:**
- ❌ Credenciais (apenas token Artia)
- ❌ Dados sensíveis
- ❌ Histórico de exportações

### Limpeza de Dados

**Automática:**
- Cache de projetos expira em 24h
- Revalidação automática

**Manual:**
- Botão "Limpar Cache" (projetos)
- Botão "Limpar Eventos" (após exportar)
- Botão "Limpar Tudo" (reset completo)

## 🔒 Segurança

### Token Artia

**Armazenamento:**
```javascript
localStorage.setItem('artia_token', 'seu-token');
```

**Uso:**
```javascript
headers: {
  'Authorization': `Bearer ${token}`
}
```

**Segurança:**
- ⚠️ Token visível no localStorage
- ✅ HTTPS obrigatório
- ✅ Sem exposição em logs
- ✅ Renovação periódica recomendada

### Dados Locais

- Armazenados apenas no navegador do usuário
- Não enviados para servidor próprio
- Exportação manual pelo usuário
- Sem sincronização automática

## 📊 Vantagens desta Arquitetura

### Simplicidade
- ✅ Sem backend para manter
- ✅ Sem banco de dados
- ✅ Sem custos de infraestrutura
- ✅ Deploy simples (site estático)

### Performance
- ✅ Tudo roda no cliente
- ✅ Sem latência de rede (dados locais)
- ✅ Cache agressivo
- ✅ Offline-first

### Privacidade
- ✅ Dados ficam no navegador do usuário
- ✅ Sem servidor intermediário
- ✅ Usuário controla exportações
- ✅ Sem tracking

### Custo
- ✅ Vercel Free Tier (100GB/mês)
- ✅ Sem MongoDB
- ✅ Sem Serverless Functions
- ✅ **Total: $0/mês**

## ⚠️ Limitações

### Dados Locais
- ❌ Perdidos ao limpar cache do navegador
- ❌ Não sincronizam entre dispositivos
- ❌ Limite de ~10MB no localStorage

**Solução:** Exportar frequentemente!

### API Artia
- ❌ Depende de disponibilidade da API
- ❌ Rate limits da API Artia
- ❌ Requer token válido

**Solução:** Cache de 24h minimiza chamadas

### Multi-usuário
- ❌ Não suporta múltiplos usuários
- ❌ Cada navegador = instância separada

**Solução:** Cada usuário usa seu próprio navegador

## 🎯 Casos de Uso

### Uso Típico
```
1. Segunda-feira: Abrir app, sincronizar projetos
2. Durante a semana: Registrar eventos
3. Sexta-feira: Exportar CSV, enviar para gestor
4. Limpar eventos locais
5. Repetir próxima semana
```

### Backup
```
1. Exportar XLSX semanalmente
2. Salvar em pasta local/nuvem
3. Manter histórico de exportações
```

## 📚 Comparação com Arquitetura Anterior

| Aspecto | Anterior (MongoDB) | Atual (Local) |
|---------|-------------------|---------------|
| Backend | Node.js + Express | Nenhum |
| Database | MongoDB Atlas | localStorage |
| Deploy | Backend + Frontend | Frontend apenas |
| Custo | $0-77/mês | $0/mês |
| Complexidade | Alta | Baixa |
| Manutenção | Média | Mínima |
| Multi-user | Sim | Não |
| Sincronização | Automática | Manual (export) |
| Offline | Parcial | Total |

## 🚀 Próximos Passos

1. ✅ Implementar cliente API Artia
2. ✅ Implementar cache local
3. ✅ Adaptar componentes React
4. ⏳ Testar integração com API Artia
5. ⏳ Deploy na Vercel
6. ⏳ Documentação de uso

---

**Arquitetura simplificada = Menos complexidade, mais foco no usuário!** 🎉
