# Deploy Rápido na Vercel 🚀

## TL;DR - Deploy em 5 Minutos

```bash
# 1. Gerar secrets
cd artia-system
node scripts/generate-secrets.js

# 2. Criar MongoDB Atlas (gratuito)
# https://cloud.mongodb.com

# 3. Deploy Backend
cd backend
vercel
# Adicione as variáveis quando solicitado

# 4. Deploy Frontend  
cd ../frontend
vercel
# Adicione VITE_API_URL com a URL do backend

# 5. Acesse sua aplicação!
```

## 📋 Checklist Rápido

### MongoDB Atlas
- [ ] Criar conta em mongodb.com/cloud/atlas
- [ ] Criar cluster M0 (gratuito)
- [ ] Criar usuário do database
- [ ] Permitir acesso de qualquer IP (0.0.0.0/0)
- [ ] Copiar connection string

### Backend (Vercel)
- [ ] Deploy: `cd backend && vercel`
- [ ] Adicionar variáveis de ambiente:
  - `MONGODB_URI` (do Atlas)
  - `JWT_SECRET` (gerar com script)
  - `JWT_REFRESH_SECRET` (gerar com script)
  - `CORS_ORIGIN` (URL do frontend)
- [ ] Copiar URL do backend

### Frontend (Vercel)
- [ ] Deploy: `cd frontend && vercel`
- [ ] Adicionar variável:
  - `VITE_API_URL` (URL do backend + /api/v1)
- [ ] Copiar URL do frontend

### Finalizar
- [ ] Atualizar `CORS_ORIGIN` no backend com URL do frontend
- [ ] Criar primeiro usuário via API
- [ ] Testar login

## 🔑 Variáveis de Ambiente

### Backend
```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/artia
JWT_SECRET=<gerar com script>
JWT_REFRESH_SECRET=<gerar com script>
CORS_ORIGIN=https://seu-frontend.vercel.app
```

### Frontend
```bash
VITE_API_URL=https://seu-backend.vercel.app/api/v1
```

## 🆕 Criar Primeiro Usuário

```bash
curl -X POST https://SEU-BACKEND.vercel.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@artia.com",
    "password": "senha123",
    "name": "Admin"
  }'
```

## 📚 Documentação Completa

Veja `VERCEL_DEPLOY.md` para instruções detalhadas.

## 💡 Dicas

- Use MongoDB Atlas M0 (gratuito) para começar
- Vercel Free Tier é suficiente para uso pessoal
- Guarde os secrets em local seguro
- Configure custom domain depois do deploy inicial

## 🐛 Problemas Comuns

**"Cannot connect to MongoDB"**
- Verifique se liberou acesso de qualquer IP no Atlas
- Confirme que a connection string está correta

**"CORS error"**
- Verifique se `CORS_ORIGIN` está correto no backend
- URL deve ser exata, sem barra no final

**"Function timeout"**
- Serverless functions têm limite de 10s (free tier)
- Otimize queries pesadas

## 🎉 Pronto!

Seu sistema está no ar em:
- Frontend: `https://seu-app.vercel.app`
- Backend: `https://seu-api.vercel.app`

**Custo: $0/mês** com planos gratuitos! 🎊
