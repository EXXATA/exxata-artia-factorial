# 🚀 Deploy na Vercel - Sistema Artia

Guia completo para fazer deploy do sistema Artia na Vercel.

## 📋 Pré-requisitos

1. Conta na [Vercel](https://vercel.com) (gratuita)
2. Conta no [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (gratuita)
3. Código do projeto no GitHub/GitLab/Bitbucket
4. CLI da Vercel instalada (opcional): `npm i -g vercel`

## 🗄️ Passo 1: Configurar MongoDB Atlas

### 1.1 Criar Cluster

1. Acesse [MongoDB Atlas](https://cloud.mongodb.com)
2. Crie uma conta ou faça login
3. Clique em "Build a Database"
4. Escolha **M0 (Free Tier)**
5. Selecione a região mais próxima
6. Nomeie o cluster: `artia-cluster`
7. Clique em "Create"

### 1.2 Configurar Acesso

1. Em "Database Access", crie um usuário:
   - Username: `artia_user`
   - Password: Gere uma senha forte (salve!)
   - Role: `Atlas admin`

2. Em "Network Access", adicione IP:
   - Clique em "Add IP Address"
   - Selecione "Allow Access from Anywhere" (0.0.0.0/0)
   - Confirme

### 1.3 Obter Connection String

1. Clique em "Connect" no seu cluster
2. Escolha "Connect your application"
3. Copie a connection string:
   ```
   mongodb+srv://artia_user:<password>@artia-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Substitua `<password>` pela senha criada
5. Adicione o nome do database: `/artia` antes do `?`
   ```
   mongodb+srv://artia_user:SUA_SENHA@artia-cluster.xxxxx.mongodb.net/artia?retryWrites=true&w=majority
   ```

## 🔧 Passo 2: Preparar o Código

### 2.1 Estrutura para Vercel

O projeto já está configurado com:
- `frontend/vercel.json` - Configuração do frontend
- `backend/vercel.json` - Configuração do backend
- `backend/api/index.js` - Serverless function principal

### 2.2 Atualizar package.json do Backend

Certifique-se de que o `backend/package.json` tem:

```json
{
  "type": "module",
  "engines": {
    "node": ">=18.x"
  }
}
```

## 📤 Passo 3: Deploy do Backend

### 3.1 Via Vercel Dashboard

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Importe seu repositório
3. Configure o projeto:
   - **Framework Preset**: Other
   - **Root Directory**: `artia-system/backend`
   - **Build Command**: (deixe vazio)
   - **Output Directory**: (deixe vazio)

4. Adicione as variáveis de ambiente:

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://artia_user:SUA_SENHA@artia-cluster.xxxxx.mongodb.net/artia?retryWrites=true&w=majority
JWT_SECRET=seu-super-secret-jwt-key-mude-isso-em-producao
JWT_REFRESH_SECRET=seu-super-secret-refresh-key-mude-isso-em-producao
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=https://seu-frontend.vercel.app
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

5. Clique em "Deploy"

6. Após o deploy, copie a URL: `https://artia-backend.vercel.app`

### 3.2 Via CLI (Alternativa)

```bash
cd backend

# Login na Vercel
vercel login

# Deploy
vercel

# Adicionar variáveis de ambiente
vercel env add MONGODB_URI
vercel env add JWT_SECRET
vercel env add JWT_REFRESH_SECRET
vercel env add CORS_ORIGIN

# Deploy para produção
vercel --prod
```

## 🎨 Passo 4: Deploy do Frontend

### 4.1 Atualizar Configuração

Edite `frontend/vercel.json` e atualize a URL do backend:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://SEU-BACKEND.vercel.app/api/:path*"
    }
  ]
}
```

### 4.2 Via Vercel Dashboard

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Importe o mesmo repositório (ou crie novo projeto)
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `artia-system/frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. Adicione variável de ambiente:

```env
VITE_API_URL=https://SEU-BACKEND.vercel.app/api/v1
```

5. Clique em "Deploy"

6. Após o deploy, sua URL será: `https://artia-frontend.vercel.app`

### 4.3 Via CLI (Alternativa)

```bash
cd frontend

# Deploy
vercel

# Adicionar variável
vercel env add VITE_API_URL

# Deploy para produção
vercel --prod
```

## 🔐 Passo 5: Configurar CORS

Volte ao backend e atualize a variável `CORS_ORIGIN`:

```bash
vercel env add CORS_ORIGIN production
# Digite: https://artia-frontend.vercel.app
```

Faça redeploy do backend:
```bash
vercel --prod
```

## 👤 Passo 6: Criar Usuário Inicial

### Opção 1: Via API

```bash
curl -X POST https://SEU-BACKEND.vercel.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seu@email.com",
    "password": "senha123",
    "name": "Seu Nome"
  }'
```

### Opção 2: Via MongoDB Atlas

1. Acesse MongoDB Atlas
2. Vá em "Collections"
3. Crie um documento na collection `users`:

```javascript
{
  "userId": "user_admin_001",
  "email": "admin@artia.com",
  "passwordHash": "$2a$10$...", // Use bcrypt para gerar
  "name": "Administrador",
  "createdAt": new Date(),
  "updatedAt": new Date()
}
```

## ✅ Passo 7: Testar

1. Acesse: `https://artia-frontend.vercel.app`
2. Faça login com as credenciais criadas
3. Teste as funcionalidades:
   - Criar evento
   - Listar eventos
   - Importar projetos
   - Exportar CSV/XLSX

## 🔧 Configurações Avançadas

### Custom Domain

1. No dashboard da Vercel, vá em "Settings" > "Domains"
2. Adicione seu domínio: `artia.seudominio.com`
3. Configure DNS conforme instruções
4. Atualize `CORS_ORIGIN` no backend

### Monitoramento

A Vercel oferece:
- **Analytics**: Métricas de uso
- **Logs**: Logs em tempo real
- **Speed Insights**: Performance

Acesse em: Dashboard > Seu Projeto > Analytics

### Limites do Plano Gratuito

**Vercel Free Tier:**
- 100 GB bandwidth/mês
- Serverless Function: 100 GB-Hrs
- 100 builds/dia
- Suficiente para uso pessoal/pequenas equipes

**MongoDB Atlas Free Tier (M0):**
- 512 MB storage
- Shared RAM
- Sem backup automático
- Suficiente para ~10.000 eventos

## 🚨 Troubleshooting

### Erro: "Cannot connect to MongoDB"

```bash
# Verifique a connection string
vercel env ls

# Teste a conexão
curl https://SEU-BACKEND.vercel.app/api/health
```

### Erro: "CORS policy"

1. Verifique `CORS_ORIGIN` no backend
2. Deve ser exatamente a URL do frontend
3. Sem barra no final: ✅ `https://app.com` ❌ `https://app.com/`

### Erro: "Function timeout"

Serverless functions têm limite de tempo:
- Free: 10 segundos
- Pro: 60 segundos

Otimize queries pesadas ou considere upgrade.

### Erro: "Module not found"

```bash
# Certifique-se que todas as dependências estão no package.json
cd backend
npm install
vercel --prod
```

## 📊 Variáveis de Ambiente - Checklist

**Backend:**
- [ ] `NODE_ENV=production`
- [ ] `MONGODB_URI` (MongoDB Atlas)
- [ ] `JWT_SECRET` (senha forte)
- [ ] `JWT_REFRESH_SECRET` (senha forte diferente)
- [ ] `JWT_EXPIRES_IN=1h`
- [ ] `JWT_REFRESH_EXPIRES_IN=7d`
- [ ] `CORS_ORIGIN` (URL do frontend)
- [ ] `RATE_LIMIT_WINDOW_MS=60000`
- [ ] `RATE_LIMIT_MAX_REQUESTS=100`

**Frontend:**
- [ ] `VITE_API_URL` (URL do backend + /api/v1)

## 🔄 Atualizações Futuras

Para atualizar o sistema:

```bash
# Faça commit das mudanças
git add .
git commit -m "Update: nova feature"
git push

# Vercel fará deploy automático!
```

Ou force um redeploy:
```bash
vercel --prod
```

## 💰 Custos

**Configuração Gratuita:**
- Vercel: $0/mês (Free Tier)
- MongoDB Atlas: $0/mês (M0 Tier)
- **Total: $0/mês** ✨

**Para produção (recomendado):**
- Vercel Pro: $20/mês
- MongoDB Atlas M10: $57/mês
- **Total: ~$77/mês**

## 📞 Suporte

- [Vercel Docs](https://vercel.com/docs)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com)
- [Vercel Community](https://github.com/vercel/vercel/discussions)

---

**Pronto!** 🎉 Seu sistema Artia está no ar na Vercel!
