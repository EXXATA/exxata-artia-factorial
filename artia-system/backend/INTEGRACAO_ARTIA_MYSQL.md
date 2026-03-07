# Integração com Banco MySQL do Artia

Este sistema permite autenticação e sincronização de dados **diretamente do banco MySQL do Artia** via conexão ODBC/MySQL, eliminando a necessidade de usar a API REST.

## Vantagens da Conexão Direta

✅ **Performance superior** - Acesso direto ao banco sem overhead de API  
✅ **Sem rate limits** - Não há limitação de requisições  
✅ **Dados em tempo real** - Informações sempre atualizadas  
✅ **Menor latência** - Conexão direta sem intermediários  
✅ **Queries customizadas** - Controle total sobre consultas SQL  

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│ 1. Usuário faz login com email/senha                    │
│    ↓                                                     │
│ 2. Backend consulta tabela 'usuarios' no MySQL Artia    │
│    ↓                                                     │
│ 3. Valida senha (bcrypt) direto no banco                │
│    ↓                                                     │
│ 4. Cria/atualiza usuário no Supabase                    │
│    ↓                                                     │
│ 5. Retorna JWT do sistema                               │
└─────────────────────────────────────────────────────────┘
```

## Configuração

### 1. Instalar dependência MySQL

```bash
cd backend
npm install mysql2
```

### 2. Configurar variáveis de ambiente

Adicione ao `.env`:

```env
# Artia Database (MySQL/ODBC)
ARTIA_DB_HOST=servidor-artia.empresa.com
ARTIA_DB_PORT=3306
ARTIA_DB_USER=usuario_leitura
ARTIA_DB_PASSWORD=senha_segura
ARTIA_DB_NAME=artia_production
```

**Importante**: Use um usuário com **permissões apenas de leitura** (SELECT) nas tabelas necessárias.

### 3. Estrutura do Banco Artia (Esperada)

O sistema espera as seguintes tabelas no banco MySQL do Artia:

#### Tabela `usuarios`
```sql
CREATE TABLE usuarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  senha VARCHAR(255) NOT NULL,  -- Hash bcrypt
  ativo TINYINT(1) DEFAULT 1,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabela `projetos`
```sql
CREATE TABLE projetos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  numero VARCHAR(50) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  ativo TINYINT(1) DEFAULT 1,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabela `atividades`
```sql
CREATE TABLE atividades (
  id INT PRIMARY KEY AUTO_INCREMENT,
  projeto_id INT NOT NULL,
  nome VARCHAR(255) NOT NULL,
  codigo VARCHAR(50),
  ativo TINYINT(1) DEFAULT 1,
  FOREIGN KEY (projeto_id) REFERENCES projetos(id)
);
```

**Nota**: Se as tabelas tiverem nomes ou estruturas diferentes, ajuste as queries em `ArtiaDBService.js`.

## Endpoints da API

### `POST /api/v1/artia-db/login`
Autentica usuário via banco MySQL do Artia.

**Request:**
```json
{
  "email": "usuario@empresa.com",
  "password": "senha123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt-do-sistema...",
    "user": {
      "id": "uuid-supabase",
      "email": "usuario@empresa.com",
      "name": "Nome do Usuário",
      "artiaUserId": "123"
    }
  }
}
```

### `GET /api/v1/artia-db/projects`
Busca todos os projetos ativos do Artia (requer autenticação).

**Headers:**
```
Authorization: Bearer jwt-do-sistema...
```

**Response:**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": 1,
        "number": "PRJ-001",
        "name": "Projeto Exemplo",
        "active": true,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "count": 1
  }
}
```

### `GET /api/v1/artia-db/projects/:projectId/activities`
Busca atividades de um projeto específico.

**Response:**
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": 1,
        "projectId": 1,
        "label": "Desenvolvimento",
        "code": "DEV",
        "artiaId": "1",
        "active": true
      }
    ],
    "count": 1
  }
}
```

### `POST /api/v1/artia-db/sync-projects`
Sincroniza projetos e atividades do Artia (requer autenticação).

**Response:**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": 1,
        "number": "PRJ-001",
        "name": "Projeto Exemplo",
        "activities": [...]
      }
    ],
    "count": 1
  }
}
```

## Segurança

### Permissões do Usuário MySQL

Crie um usuário dedicado com **apenas leitura**:

```sql
-- Criar usuário
CREATE USER 'artia_readonly'@'%' IDENTIFIED BY 'senha_forte_aqui';

-- Conceder apenas SELECT nas tabelas necessárias
GRANT SELECT ON artia_database.usuarios TO 'artia_readonly'@'%';
GRANT SELECT ON artia_database.projetos TO 'artia_readonly'@'%';
GRANT SELECT ON artia_database.atividades TO 'artia_readonly'@'%';

-- Aplicar permissões
FLUSH PRIVILEGES;
```

### Validação de Senha

O sistema espera que as senhas estejam armazenadas em **bcrypt** no banco Artia.

Se o Artia usar outro formato (MD5, SHA, etc.), ajuste em `ArtiaDBService.js`:

```javascript
// Para MD5 (exemplo)
const crypto = require('crypto');
const hash = crypto.createHash('md5').update(password).digest('hex');
const isPasswordValid = (hash === user.password_hash);

// Para SHA256 (exemplo)
const hash = crypto.createHash('sha256').update(password).digest('hex');
const isPasswordValid = (hash === user.password_hash);
```

### Conexão Segura

Para produção, use **SSL/TLS**:

```javascript
// Em ArtiaDBConnection.js
this.pool = mysql.createPool({
  host: process.env.ARTIA_DB_HOST,
  port: process.env.ARTIA_DB_PORT || 3306,
  user: process.env.ARTIA_DB_USER,
  password: process.env.ARTIA_DB_PASSWORD,
  database: process.env.ARTIA_DB_NAME,
  ssl: {
    ca: fs.readFileSync('/path/to/ca-cert.pem'),
    rejectUnauthorized: true
  }
});
```

## Pool de Conexões

O sistema usa **connection pooling** para melhor performance:

- **connectionLimit**: 10 conexões simultâneas
- **queueLimit**: 0 (sem limite de fila)
- **keepAlive**: Mantém conexões ativas

Ajuste conforme necessário em `ArtiaDBConnection.js`.

## Troubleshooting

### Erro: "Access denied for user"
- Verifique credenciais em `.env`
- Confirme permissões do usuário MySQL
- Teste conexão: `mysql -h HOST -u USER -p`

### Erro: "Unknown column"
- Estrutura do banco Artia é diferente
- Ajuste queries em `ArtiaDBService.js`
- Verifique nomes de colunas com `DESCRIBE usuarios;`

### Erro: "Too many connections"
- Reduza `connectionLimit` no pool
- Verifique `max_connections` no MySQL
- Monitore conexões ativas: `SHOW PROCESSLIST;`

### Senha não valida
- Confirme formato de hash no banco
- Ajuste validação em `login()` do `ArtiaDBService`
- Teste hash: `SELECT senha FROM usuarios WHERE email = 'teste@email.com';`

## Migração de API para MySQL

Se você já estava usando a API REST do Artia:

1. **Mantenha ambas as rotas** (transição gradual):
   - `/api/v1/artia-auth/*` - API REST (antigo)
   - `/api/v1/artia-db/*` - MySQL direto (novo)

2. **Atualize frontend gradualmente**:
   ```javascript
   // Trocar de:
   import { artiaAuthService } from './artiaAuthService';
   
   // Para:
   import { artiaDBAuthService } from './artiaDBAuthService';
   ```

3. **Remova rotas antigas** após validação completa

## Performance

### Índices Recomendados

```sql
-- Otimizar login
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_ativo ON usuarios(ativo);

-- Otimizar busca de projetos
CREATE INDEX idx_projetos_ativo ON projetos(ativo);
CREATE INDEX idx_projetos_numero ON projetos(numero);

-- Otimizar busca de atividades
CREATE INDEX idx_atividades_projeto ON atividades(projeto_id);
CREATE INDEX idx_atividades_ativo ON atividades(ativo);
```

### Cache (Opcional)

Para reduzir carga no banco Artia, implemente cache:

```javascript
import NodeCache from 'node-cache';

const projectsCache = new NodeCache({ stdTTL: 600 }); // 10 min

async getUserProjects() {
  const cached = projectsCache.get('projects');
  if (cached) return cached;
  
  const projects = await artiaDB.query(...);
  projectsCache.set('projects', projects);
  return projects;
}
```

## Monitoramento

### Logs de Conexão

```javascript
// Em ArtiaDBConnection.js
this.pool.on('connection', (connection) => {
  console.log('Nova conexão MySQL estabelecida:', connection.threadId);
});

this.pool.on('release', (connection) => {
  console.log('Conexão MySQL liberada:', connection.threadId);
});
```

### Métricas

Monitore:
- Tempo de resposta das queries
- Número de conexões ativas
- Erros de conexão
- Taxa de cache hit (se implementado)

## Próximos Passos

1. ✅ Instalar `mysql2`
2. ✅ Configurar `.env` com credenciais
3. ✅ Testar conexão ao banco Artia
4. ✅ Validar estrutura das tabelas
5. ✅ Ajustar queries se necessário
6. ✅ Testar login via MySQL
7. ✅ Sincronizar projetos/atividades
8. ✅ Atualizar frontend para usar novos endpoints
