# Integração com Autenticação Artia

Este sistema permite que usuários façam login usando suas credenciais do Artia, eliminando a necessidade de criar contas separadas.

## Como Funciona

### Fluxo de Autenticação

```
1. Usuário insere email/senha do Artia no frontend
   ↓
2. Backend autentica via API Artia
   ↓
3. API Artia retorna token de acesso
   ↓
4. Backend cria/atualiza usuário no Supabase
   ↓
5. Backend gera JWT próprio do sistema
   ↓
6. Frontend recebe ambos os tokens:
   - JWT do sistema (para autenticação nas rotas)
   - Token Artia (para buscar projetos/atividades)
```

### Vantagens

✅ **Login único** - Usuário usa mesmas credenciais do Artia  
✅ **Sincronização automática** - Projetos/atividades vêm direto do Artia  
✅ **Sem duplicação** - Não precisa criar conta separada  
✅ **Segurança** - Token Artia validado a cada requisição  
✅ **Multi-tenant** - Eventos isolados por `user_id` no Supabase  

## Configuração

### 1. Backend

**Variáveis de ambiente** (`.env`):
```bash
ARTIA_API_URL=https://api.artia.com
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anon
JWT_SECRET=seu-secret-jwt
```

**Migration necessária**:
Execute `supabase/migrations/20260306000004_create_users_table.sql` no Supabase.

### 2. Endpoints da API

#### `POST /api/v1/artia-auth/login`
Autentica usuário com credenciais Artia.

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
    "artiaToken": "token-artia...",
    "user": {
      "id": "uuid",
      "email": "usuario@empresa.com",
      "name": "Nome do Usuário",
      "artiaUserId": "id-artia"
    }
  }
}
```

#### `POST /api/v1/artia-auth/validate`
Valida token Artia.

**Request:**
```json
{
  "artiaToken": "token-artia..."
}
```

#### `POST /api/v1/artia-auth/sync-projects`
Sincroniza projetos do Artia (requer autenticação).

**Headers:**
```
Authorization: Bearer jwt-do-sistema...
```

**Request:**
```json
{
  "artiaToken": "token-artia..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "projects": [...],
    "count": 10
  }
}
```

## Frontend

### Componentes

**`ArtiaLoginModal`** - Modal de login com credenciais Artia  
**`useAuth`** - Hook para gerenciar estado de autenticação  

### Uso

```jsx
import { useState } from 'react';
import ArtiaLoginModal from './components/auth/ArtiaLoginModal';
import { useAuth } from './hooks/useAuth';

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const { user, isAuthenticated, login, logout } = useAuth();

  const handleLoginSuccess = (data) => {
    login(data);
    // Opcional: sincronizar projetos
  };

  return (
    <>
      {!isAuthenticated ? (
        <button onClick={() => setShowLogin(true)}>
          Login com Artia
        </button>
      ) : (
        <div>
          Bem-vindo, {user.name}
          <button onClick={logout}>Sair</button>
        </div>
      )}

      <ArtiaLoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
}
```

### Serviços

```javascript
import { artiaAuthService } from './services/api/artiaAuthService';

// Login
const response = await artiaAuthService.login(email, password);

// Verificar autenticação
const isAuth = artiaAuthService.isAuthenticated();

// Obter usuário atual
const user = artiaAuthService.getCurrentUser();

// Logout
artiaAuthService.logout();

// Sincronizar projetos
const projects = await artiaAuthService.syncProjects(artiaToken);
```

## Integração com API Artia

### Endpoints Artia Utilizados

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/auth/login` | POST | Autenticação |
| `/auth/me` | GET | Validar token |
| `/projects` | GET | Listar projetos |
| `/projects/:id/activities` | GET | Listar atividades |

### Headers Artia

```
Authorization: Bearer {artia_token}
Content-Type: application/json
```

## Fluxo de Dados

### Login
```
Frontend                Backend              Artia API           Supabase
   |                       |                     |                  |
   |-- email/senha ------->|                     |                  |
   |                       |-- autenticar ------>|                  |
   |                       |<--- token ----------|                  |
   |                       |                     |                  |
   |                       |-- criar/atualizar user -------------->|
   |                       |<--- user criado ---------------------|
   |                       |                     |                  |
   |<-- JWT + token Artia--|                     |                  |
```

### Buscar Eventos
```
Frontend                Backend              Supabase
   |                       |                     |
   |-- GET /events ------->|                     |
   |   (JWT header)        |                     |
   |                       |-- SELECT * FROM events
   |                       |   WHERE user_id = ? |
   |                       |<--- eventos --------|
   |<--- eventos ----------|                     |
```

### Sincronizar Projetos
```
Frontend                Backend              Artia API           Supabase
   |                       |                     |                  |
   |-- sync-projects ----->|                     |                  |
   |   (JWT + artiaToken)  |                     |                  |
   |                       |-- GET /projects --->|                  |
   |                       |<--- projetos -------|                  |
   |                       |                     |                  |
   |                       |-- UPSERT projects ---------------->|
   |                       |<--- ok ---------------------------|
   |<--- projetos ---------|                     |                  |
```

## Segurança

### Tokens

- **JWT do sistema**: Expira em 24h (configurável)
- **Token Artia**: Gerenciado pelo Artia, armazenado no Supabase
- **Refresh**: Usuário faz login novamente quando JWT expira

### Row Level Security (RLS)

Eventos são isolados por `user_id`:
```sql
CREATE POLICY "Users can read own events"
  ON events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);
```

### Validação

- Email/senha validados pela API Artia
- JWT validado pelo middleware `authMiddleware`
- Token Artia pode ser revalidado via `/artia-auth/validate`

## Troubleshooting

### Erro: "Credenciais inválidas do Artia"
- Verifique email/senha no Artia
- Confirme que `ARTIA_API_URL` está correto

### Erro: "Token Artia inválido ou expirado"
- Usuário precisa fazer login novamente
- Token Artia pode ter expirado

### Erro: "No token provided"
- Frontend não está enviando header `Authorization`
- Verificar se `localStorage.getItem('auth_token')` existe

### Projetos não sincronizam
- Verificar se token Artia está válido
- Confirmar permissões do usuário no Artia
- Checar logs do backend para erros da API Artia

## Próximos Passos

1. **Implementar refresh token** - Renovar JWT automaticamente
2. **Cache de projetos** - Evitar chamadas repetidas ao Artia
3. **Sincronização automática** - Atualizar projetos periodicamente
4. **Logout automático** - Quando token Artia expira
5. **SSO** - Integrar com outros provedores se necessário
