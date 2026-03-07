# 🚀 Quick Start - Sistema Artia

Guia rápido para colocar o sistema no ar em minutos.

## Pré-requisitos

- Node.js 20+ instalado
- MongoDB 7+ instalado (ou Docker)

## Opção 1: Docker (Mais Rápido) 🐳

```bash
# 1. Entre no diretório do projeto
cd artia-system

# 2. Inicie tudo com Docker
docker-compose up -d

# 3. Aguarde ~30 segundos para os containers iniciarem

# 4. Acesse o sistema
# Frontend: http://localhost:5173
# Backend: http://localhost:3000
```

**Credenciais padrão:**
- Email: `admin@artia.com`
- Senha: `admin123`

## Opção 2: Instalação Local 💻

### Passo 1: MongoDB

```bash
# Se tiver Docker, apenas MongoDB:
docker run -d -p 27017:27017 --name artia-mongo mongo:7.0

# OU inicie MongoDB local:
mongod --dbpath /caminho/para/dados
```

### Passo 2: Backend

```bash
cd backend

# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env

# Edite o .env se necessário (opcional)
# nano .env

# Setup inicial (cria usuário admin)
npm run setup

# Iniciar servidor
npm run dev
```

O backend estará rodando em `http://localhost:3000`

### Passo 3: Frontend

```bash
# Em outro terminal
cd frontend

# Instalar dependências
npm install

# Configurar ambiente (opcional)
cp .env.example .env

# Iniciar aplicação
npm run dev
```

O frontend estará rodando em `http://localhost:5173`

## 🎯 Primeiro Acesso

1. Abra http://localhost:5173
2. Faça login com:
   - Email: `admin@artia.com`
   - Senha: `admin123`
3. **IMPORTANTE:** Altere a senha após o primeiro login!

## 📊 Importar Base de IDs (Opcional)

Se você tem um arquivo XLSX com projetos e atividades:

1. Faça login no sistema
2. Vá para a view "Diretório"
3. Clique em "Importar Base"
4. Selecione seu arquivo XLSX
5. Aguarde a importação

**Formato esperado do XLSX:**
| Coluna A | Coluna B | Coluna C |
|----------|----------|----------|
| ID Artia | Atividade | Projeto |
| 12345 | Desenvolvimento | 1001 - Projeto X |

## 🔧 Verificação de Saúde

### Backend
```bash
curl http://localhost:3000/health
# Resposta esperada: {"status":"ok","timestamp":"..."}
```

### MongoDB
```bash
# Via Docker
docker exec -it artia-mongodb mongosh

# Local
mongosh

# Verificar dados
use artia
db.users.countDocuments()
```

## 📝 Próximos Passos

1. **Criar mais usuários** (se necessário)
   - Use a API `/api/v1/auth/register`
   - Ou crie via MongoDB diretamente

2. **Importar dados antigos**
   - Veja `MIGRATION_GUIDE.md` para detalhes

3. **Configurar backup**
   - Configure backup automático do MongoDB
   - Exporte dados regularmente via XLSX

4. **Personalizar**
   - Ajuste cores no `tailwind.config.js`
   - Configure horários em `shared/constants/timeConfig.js`

## 🐛 Problemas Comuns

### "Cannot connect to MongoDB"
```bash
# Verifique se MongoDB está rodando
docker ps | grep mongo
# ou
ps aux | grep mongod

# Reinicie se necessário
docker restart artia-mongodb
```

### "Port 3000 already in use"
```bash
# Encontre o processo
lsof -i :3000

# Mate o processo ou mude a porta no .env
PORT=3001
```

### "Port 5173 already in use"
```bash
# Vite escolherá automaticamente outra porta
# Ou especifique no vite.config.js
```

### Frontend não conecta ao Backend
```bash
# Verifique CORS no backend/.env
CORS_ORIGIN=http://localhost:5173

# Verifique URL da API no frontend/.env
VITE_API_URL=http://localhost:3000/api/v1
```

## 🔑 Comandos Úteis

```bash
# Backend
npm run dev          # Desenvolvimento
npm start            # Produção
npm run setup        # Setup inicial
npm test             # Testes

# Frontend
npm run dev          # Desenvolvimento
npm run build        # Build produção
npm run preview      # Preview do build

# Docker
docker-compose up -d              # Iniciar tudo
docker-compose down               # Parar tudo
docker-compose logs -f backend    # Ver logs do backend
docker-compose restart backend    # Reiniciar backend
```

## 📚 Documentação Completa

- `README.md` - Visão geral do sistema
- `MIGRATION_GUIDE.md` - Migração do sistema antigo
- `backend/README.md` - Documentação do backend
- `frontend/README.md` - Documentação do frontend

## 🆘 Suporte

Se encontrar problemas:
1. Verifique os logs: `docker-compose logs -f`
2. Consulte a documentação completa
3. Verifique as issues conhecidas

---

**Pronto!** 🎉 Seu sistema Artia está rodando!
