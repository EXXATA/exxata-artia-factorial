# Guia de Migração - Sistema Artia

Este guia ajuda na migração do sistema antigo (index.html monolítico) para o novo sistema refatorado.

## 📋 Pré-requisitos

- Node.js 20+
- MongoDB 7+
- Dados do sistema antigo (IndexedDB ou backup XLSX)

## 🔄 Processo de Migração

### Passo 1: Backup dos Dados Antigos

Antes de migrar, faça backup dos dados do sistema antigo:

1. Abra o sistema antigo no navegador
2. Abra o DevTools (F12)
3. Execute no console:

```javascript
// Exportar eventos do IndexedDB
const db = await indexedDB.open('artia_offline_db_v1', 1);
const tx = db.transaction('events', 'readonly');
const events = await tx.objectStore('events').getAll();
console.log(JSON.stringify(events));
```

4. Copie o JSON gerado e salve em `backup_events.json`

### Passo 2: Configurar Novo Sistema

```bash
cd artia-system

# Backend
cd backend
npm install
cp .env.example .env
# Edite o .env com suas configurações

# Frontend
cd ../frontend
npm install
cp .env.example .env
```

### Passo 3: Iniciar MongoDB

```bash
# Opção 1: Docker
docker-compose up -d mongodb

# Opção 2: MongoDB local
mongod --dbpath /caminho/para/dados
```

### Passo 4: Criar Script de Migração

Crie `backend/scripts/migrate.js`:

```javascript
import fs from 'fs';
import { connectDatabase } from '../src/infrastructure/database/connection.js';
import { EventRepository } from '../src/infrastructure/database/mongodb/EventRepository.js';

async function migrate() {
  await connectDatabase();
  
  const eventsData = JSON.parse(fs.readFileSync('backup_events.json', 'utf-8'));
  const eventRepo = new EventRepository();
  
  for (const event of eventsData) {
    await eventRepo.create({
      id: event.id,
      timeRange: {
        start: new Date(event.start),
        end: new Date(event.end),
        day: event.day
      },
      project: event.project,
      activity: {
        id: event.activityId,
        label: event.activityLabel
      },
      notes: event.notes || '',
      artiaLaunched: event.artiaLaunched || false,
      userId: 'default' // Ajuste conforme necessário
    });
  }
  
  console.log(`✅ Migrados ${eventsData.length} eventos`);
  process.exit(0);
}

migrate();
```

Execute:
```bash
node scripts/migrate.js
```

### Passo 5: Migrar Base de IDs (Projetos/Atividades)

Se você tem um arquivo XLSX com a base de IDs:

1. Inicie o backend: `npm run dev`
2. Use a API de importação:

```bash
curl -X POST http://localhost:3000/api/v1/projects/import \
  -H "Authorization: Bearer SEU_TOKEN" \
  -F "file=@base_ids.xlsx"
```

### Passo 6: Criar Usuário Inicial

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seu@email.com",
    "password": "senha123",
    "name": "Seu Nome"
  }'
```

### Passo 7: Testar Sistema

1. Inicie backend: `cd backend && npm run dev`
2. Inicie frontend: `cd frontend && npm run dev`
3. Acesse: http://localhost:5173
4. Faça login com as credenciais criadas
5. Verifique se os dados foram migrados corretamente

## 🔍 Verificação de Dados

### Verificar Eventos Migrados

```javascript
// No MongoDB
use artia
db.events.countDocuments()
db.events.find().limit(5)
```

### Verificar Projetos

```javascript
db.projects.countDocuments()
db.projects.find().limit(5)
```

## 📊 Comparação de Funcionalidades

| Funcionalidade | Sistema Antigo | Sistema Novo | Status |
|----------------|----------------|--------------|--------|
| CRUD Eventos | ✅ IndexedDB | ✅ MongoDB + API | ✅ Migrado |
| Calendário Semanal | ✅ | ✅ | ✅ Migrado |
| Gantt | ✅ | ✅ | ✅ Migrado |
| Tabela | ✅ | ✅ | ✅ Migrado |
| Gráficos | ✅ Chart.js | ✅ Chart.js | ✅ Migrado |
| Diretório | ✅ | ✅ | ✅ Migrado |
| Export CSV | ✅ | ✅ | ✅ Migrado |
| Export XLSX | ✅ | ✅ | ✅ Migrado |
| Import XLSX | ✅ | ✅ | ✅ Migrado |
| Tema Dark/Light | ✅ | ✅ | ✅ Migrado |
| Autenticação | ❌ | ✅ JWT | ✨ Novo |
| API REST | ❌ | ✅ | ✨ Novo |
| Multi-usuário | ❌ | ✅ | ✨ Novo |

## ⚠️ Diferenças Importantes

### LocalStorage → MongoDB
- Dados agora persistem no servidor
- Necessário autenticação para acessar
- Suporte multi-usuário

### Estrutura de Dados
```javascript
// Antigo
{
  id: "ev_123",
  start: "2024-01-01T09:00:00Z",
  end: "2024-01-01T10:00:00Z",
  // ...
}

// Novo (mesma estrutura, mas com userId)
{
  id: "ev_123",
  userId: "user_456",
  start: "2024-01-01T09:00:00Z",
  end: "2024-01-01T10:00:00Z",
  // ...
}
```

## 🐛 Troubleshooting

### Erro: "Cannot connect to MongoDB"
```bash
# Verifique se MongoDB está rodando
docker ps
# ou
ps aux | grep mongod
```

### Erro: "JWT token invalid"
- Verifique se JWT_SECRET está configurado no .env
- Faça login novamente para obter novo token

### Dados não aparecem
- Verifique se a migração foi executada com sucesso
- Confirme que está usando o usuário correto
- Verifique logs do backend

## 📞 Suporte

Em caso de problemas:
1. Verifique os logs do backend
2. Verifique o console do navegador
3. Consulte a documentação da API
4. Revise este guia de migração

## ✅ Checklist de Migração

- [ ] Backup dos dados antigos criado
- [ ] MongoDB instalado e rodando
- [ ] Backend configurado (.env)
- [ ] Frontend configurado (.env)
- [ ] Dependências instaladas (npm install)
- [ ] Script de migração executado
- [ ] Base de IDs importada
- [ ] Usuário inicial criado
- [ ] Sistema testado e funcionando
- [ ] Dados verificados no MongoDB
- [ ] Sistema antigo mantido como backup
