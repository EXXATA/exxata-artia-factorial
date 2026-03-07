# Integração Factorial - Guia de Implementação

## ✅ Backend Implementado

### Arquivos Criados

#### Infrastructure
- `src/infrastructure/external/FactorialService.js` - Serviço de integração com API Factorial

#### Domain
- `src/domain/value-objects/WorkedHoursComparison.js` - Value object para comparação de horas

#### Application - Use Cases
- `src/application/use-cases/auth/RegisterWithFactorialUseCase.js` - Registro com validação Factorial
- `src/application/use-cases/auth/LoginUseCase.js` - Login com senha local
- `src/application/use-cases/hours/GetWorkedHoursComparisonUseCase.js` - Comparação de horas

#### Presentation
- `src/presentation/http/controllers/FactorialAuthController.js` - Controller de autenticação
- `src/presentation/http/controllers/WorkedHoursController.js` - Controller de comparação de horas
- `src/presentation/http/routes/factorialAuthRoutes.js` - Rotas de autenticação
- `src/presentation/http/routes/workedHoursRoutes.js` - Rotas de comparação

#### Database
- `supabase/migrations/20260306200000_add_factorial_and_password_to_users.sql` - Migration

### Arquivos Modificados
- `src/domain/entities/User.js` - Adicionado `factorialEmployeeId`
- `src/infrastructure/database/supabase/UserRepository.js` - Métodos Factorial
- `src/server.js` - Integração completa
- `.env.example` - Variáveis Factorial

## 🔧 Configuração Necessária

### 1. Obter API Key do Factorial

1. Acesse o painel administrativo do Factorial
2. Navegue até Configurações > Integrações > API
3. Gere uma nova API Key
4. Copie a chave gerada

**Guia oficial**: https://help.factorialhr.com/how-to-create-api-keys-in-factorial

### 2. Configurar Variáveis de Ambiente

Adicione ao arquivo `.env`:

```env
# Factorial API
FACTORIAL_API_KEY=sua_api_key_aqui
FACTORIAL_API_URL=https://api.factorialhr.com
```

### 3. Aplicar Migration no Supabase

Execute a migration para adicionar os campos necessários:

```bash
# Via Supabase CLI (se configurado)
supabase db push

# OU execute manualmente no Supabase Dashboard:
# SQL Editor > New Query > Cole o conteúdo da migration
```

**Conteúdo da migration**:
```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS factorial_employee_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_users_factorial_employee_id ON users(factorial_employee_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

### 4. Instalar Dependências

```bash
cd backend
npm install bcrypt
```

## 📡 Endpoints Disponíveis

### Autenticação

#### Registro
```http
POST /api/v1/factorial-auth/register
Content-Type: application/json

{
  "email": "usuario@empresa.com",
  "password": "senha123"
}
```

**Resposta**:
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_aqui",
    "user": {
      "id": "user_id",
      "email": "usuario@empresa.com",
      "name": "Nome Completo",
      "factorialEmployeeId": "123"
    }
  }
}
```

**Validações**:
- Email deve existir no Factorial (employee ativo)
- Senha mínima de 8 caracteres
- Email não pode estar já cadastrado

#### Login
```http
POST /api/v1/factorial-auth/login
Content-Type: application/json

{
  "email": "usuario@empresa.com",
  "password": "senha123"
}
```

### Comparação de Horas

Todas as rotas requerem autenticação (Bearer token).

#### Histórico Completo
```http
GET /api/v1/worked-hours/history
Authorization: Bearer {token}
```

#### Por Dia
```http
GET /api/v1/worked-hours/daily?date=2026-03-06
Authorization: Bearer {token}
```

#### Por Mês
```http
GET /api/v1/worked-hours/monthly?year=2026&month=3
Authorization: Bearer {token}
```

**Resposta**:
```json
{
  "success": true,
  "data": {
    "comparisons": [
      {
        "date": "2026-03-06",
        "factorialHours": 8.5,
        "artiaHours": 8.0,
        "difference": -0.5,
        "hasDivergence": true,
        "status": "divergence",
        "statusColor": "red"
      }
    ],
    "stats": {
      "totalDays": 20,
      "daysWithDivergence": 3,
      "totalFactorialHours": 160,
      "totalArtiaHours": 158
    }
  }
}
```

## 🎯 Fluxo de Autenticação

### Primeiro Acesso (Registro)
1. Usuário entra com email + senha
2. Backend valida se email existe no Factorial (employee ativo)
3. Se válido, cria usuário local com hash bcrypt da senha
4. Retorna JWT do sistema

### Logins Subsequentes
1. Usuário entra com email + senha
2. Backend valida senha localmente (bcrypt)
3. Retorna novo JWT

## 📊 Comparação de Horas

### Funcionamento
- **Factorial**: Busca shifts (clock in/out) via API
- **Artia**: Busca events do usuário no Supabase
- **Comparação**: Agrupa por dia e calcula diferença
- **Divergência**: Qualquer diferença !== 0 (sem tolerância)

### Regras
- Histórico completo: últimos 2 anos
- Ordenação: data decrescente (mais recente primeiro)
- Status: `match` (verde) ou `divergence` (vermelho)

## ⚠️ Importante

### Segurança
- **API Key**: NUNCA expor no frontend (apenas backend)
- **Senha**: Hash bcrypt com 10 salt rounds
- **JWT**: Expira em 24h (configurável)

### Validações
- Email deve ser idêntico em Factorial e Artia
- Employee deve estar ativo no Factorial
- Timezone: garantir consistência entre sistemas

## 🎨 Frontend Implementado

### Arquivos Criados/Modificados

#### Services
- `src/services/api/factorialAuthService.js` - Serviço de autenticação Factorial
- `src/services/api/workedHoursService.js` - Serviço de comparação de horas

#### Pages
- `src/pages/LoginPage.jsx` - **Atualizado** com toggle registro/login
- `src/pages/WorkedHoursComparison.jsx` - **Novo** componente de comparação

#### Components
- `src/components/layout/Header.jsx` - **Atualizado** com link para Comparação

#### Routes
- `src/App.jsx` - **Atualizado** com rota `/comparison`

### Funcionalidades Frontend

#### LoginPage
- ✅ Toggle entre "Primeiro acesso" e "Login"
- ✅ Validação de senha (mínimo 8 caracteres)
- ✅ Mensagens contextuais para registro vs login
- ✅ Integração com Factorial auth service

#### WorkedHoursComparison
- ✅ Exibição de histórico completo
- ✅ Estatísticas: total de dias, divergências, horas Factorial/Artia
- ✅ Filtros: Todos, Divergências, Corretos
- ✅ Tabela com cores indicando status
- ✅ Destaque visual para divergências (fundo vermelho)
- ✅ Formatação de datas e horas

#### Header
- ✅ Novo botão "Comparação" na navegação
- ✅ Acesso rápido à página de comparação

## 🚀 Como Usar

### Primeiro Acesso (Registro)
1. Acesse a página de login
2. Clique em "Primeiro acesso?"
3. Digite seu email do Factorial
4. Crie uma senha (mínimo 8 caracteres)
5. Sistema valida se você existe no Factorial
6. Conta criada com sucesso!

### Login
1. Acesse a página de login
2. Digite email e senha
3. Clique em "Entrar"

### Visualizar Comparação
1. Após login, clique em "Comparação" no menu
2. Visualize o histórico completo
3. Use filtros para ver apenas divergências
4. Identifique dias com diferenças entre Factorial e Artia

## 🚀 Próximos Passos

### Ações Necessárias
1. **Aplicar migration no Supabase** (SQL em `supabase/migrations/...`)
2. **Testar fluxo completo**:
   - Registro de novo usuário
   - Login
   - Visualização de comparação de horas

### Testes
1. Testar registro com email válido do Factorial
2. Testar login com credenciais corretas
3. Testar comparação de horas
4. Validar divergências

## 📝 Notas Técnicas

### Arquitetura
- **DDD**: Domain-Driven Design mantido
- **Clean Architecture**: Camadas bem separadas
- **Dependency Injection**: Via constructor

### Performance
- Cache recomendado para dados Factorial
- Índices criados em `factorial_employee_id` e `email`
- Queries otimizadas no Supabase

### Limitações
- API Factorial: verificar rate limits
- Histórico: limitado a 2 anos (ajustável)
- Timezone: assumido UTC (ajustar se necessário)
