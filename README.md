# Artia-Factorial Integration System

Sistema de integração entre Artia e Factorial para gerenciamento e comparação de horas trabalhadas.

## 📋 Visão Geral

Este projeto integra o sistema de gestão de projetos Artia com o sistema de RH Factorial, permitindo:

- ✅ Autenticação unificada (Factorial + Artia DB)
- ✅ Comparação de horas trabalhadas entre sistemas
- ✅ Visualizações múltiplas: Calendário, Tabela, Gráficos e Gantt
- ✅ Sincronização automática de dados via Supabase Edge Functions
- ✅ Cache inteligente para otimização de performance

## 🏗️ Arquitetura

```
artia-main/
├── artia-system/
│   ├── backend/          # API Node.js + Express (DDD)
│   │   ├── src/
│   │   │   ├── domain/           # Entidades e regras de negócio
│   │   │   ├── application/      # Casos de uso
│   │   │   ├── infrastructure/   # Repositórios, APIs externas
│   │   │   └── presentation/     # Controllers e rotas HTTP
│   │   ├── supabase/     # Edge Functions e migrations
│   │   └── scripts/      # Scripts de manutenção
│   │
│   └── frontend/         # React + Vite + TailwindCSS
│       └── src/
│           ├── components/       # Componentes React
│           ├── hooks/            # Custom hooks
│           ├── services/         # API clients
│           └── pages/            # Páginas principais
│
└── .gitignore           # Proteção de credenciais
```

## 🚀 Setup Inicial

### Pré-requisitos

- Node.js 18+ e npm
- Conta Supabase (para cache e persistência)
- Acesso ao banco MySQL do Artia
- API Key do Factorial

### 1. Backend

```bash
cd artia-system/backend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas credenciais reais
```

**Variáveis obrigatórias no `.env`:**

```env
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key

# Artia Database (MySQL)
ARTIA_DB_HOST=seu-host-artia
ARTIA_DB_PORT=3306
ARTIA_DB_USER=seu-usuario
ARTIA_DB_PASSWORD=sua-senha
ARTIA_DB_NAME=artia

# JWT (gere chaves seguras para produção)
JWT_SECRET=sua-chave-secreta-jwt
JWT_REFRESH_SECRET=sua-chave-refresh

# Factorial API
FACTORIAL_API_KEY=sua-api-key-factorial
FACTORIAL_API_URL=https://api.factorialhr.com

# CORS (ajuste conforme seu frontend)
CORS_ORIGIN=http://localhost:5173
```

```bash
# Rodar migrações do Supabase
cd supabase
npx supabase db push

# Iniciar servidor de desenvolvimento
cd ..
npm run dev
```

### 2. Frontend

```bash
cd artia-system/frontend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env
```

**Variáveis do frontend `.env`:**

```env
VITE_API_URL=http://localhost:3000
```

```bash
# Iniciar servidor de desenvolvimento
npm run dev
```

Acesse: `http://localhost:5173`

## 🔐 Segurança

### Arquivos Protegidos pelo `.gitignore`

- ✅ Todos os arquivos `.env` (exceto `.env.example`)
- ✅ `node_modules/` e artefatos de build
- ✅ Logs e caches
- ✅ Arquivos de IDE

### ⚠️ IMPORTANTE

**Nunca commite:**
- Chaves de API reais
- Senhas de banco de dados
- Tokens JWT
- Service role keys do Supabase

Os arquivos `.env.example` contêm apenas placeholders.

## 📦 Deploy

### Backend (Vercel/Railway/Render)

1. Configure as variáveis de ambiente no painel do serviço
2. Deploy a partir da pasta `artia-system/backend`
3. Configure o CORS_ORIGIN para o domínio do frontend

### Frontend (Vercel/Netlify)

1. Configure `VITE_API_URL` para a URL do backend em produção
2. Deploy a partir da pasta `artia-system/frontend`
3. Build command: `npm run build`
4. Output directory: `dist`

### Supabase Edge Functions

```bash
cd artia-system/backend/supabase
npx supabase functions deploy sync-artia-data
```

## 🧪 Testes

```bash
# Backend
cd artia-system/backend
npm test

# Frontend
cd artia-system/frontend
npm test
```

## 📚 Documentação Adicional

- `artia-system/backend/README.md` - Detalhes do backend
- `artia-system/frontend/README.md` - Detalhes do frontend
- `artia-system/backend/VALIDACAO_INTEGRACAO.md` - Validação da integração
- `artia-system/backend/RELATORIO_IMPLEMENTACAO_FINAL.md` - Relatório técnico

## 🔄 Git Push para GitHub

### Após configurar autenticação GitHub

```bash
# Verificar status
git status

# Se necessário, adicionar mais arquivos
git add .

# Commit já foi criado, fazer push
git push origin main

# Ou para outro repositório
git remote add novo-repo https://github.com/USUARIO/REPO.git
git push novo-repo main
```

### Configurar autenticação GitHub

**Opção 1: Personal Access Token (recomendado)**

1. Acesse: https://github.com/settings/tokens
2. Gere um novo token com permissões de `repo`
3. Use o token como senha ao fazer push

**Opção 2: SSH**

```bash
# Gerar chave SSH
ssh-keygen -t ed25519 -C "seu-email@example.com"

# Adicionar ao ssh-agent
ssh-add ~/.ssh/id_ed25519

# Adicionar chave pública ao GitHub
# Copie o conteúdo de ~/.ssh/id_ed25519.pub
# Cole em: https://github.com/settings/keys

# Alterar remote para SSH
git remote set-url origin git@github.com:USUARIO/REPO.git
```

## 🤝 Contribuindo

1. Clone o repositório
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Faça suas alterações
4. Commit: `git commit -m 'feat: adicionar nova funcionalidade'`
5. Push: `git push origin feature/nova-funcionalidade`
6. Abra um Pull Request

## 📄 Licença

Propriedade da EXXATA Engenharia.

## 👥 Equipe

Desenvolvido pela equipe EXXATA.

---

**Status do Projeto:** ✅ Pronto para desenvolvimento colaborativo

**Última atualização:** Março 2026
