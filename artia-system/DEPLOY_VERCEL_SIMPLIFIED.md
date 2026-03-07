# Deploy Simplificado na Vercel 🚀

## Arquitetura Simplificada

**Sem backend próprio!** Apenas frontend estático que:
- Consulta API Artia diretamente
- Armazena dados localmente (navegador)
- Exporta quando necessário

## 🎯 Deploy em 3 Passos

### 1. Obter Token da API Artia

1. Acesse: https://artia.movidesk.com
2. Vá em Configurações > API
3. Gere um token de acesso
4. Copie o token (guarde em local seguro)

**Documentação:** https://artia.movidesk.com/kb/pt-br/article/506837/03-api

### 2. Configurar Projeto

```bash
cd artia-system/frontend

# Criar arquivo .env
cp .env.example .env

# Editar .env
nano .env
```

Adicione:
```env
VITE_ARTIA_API_URL=https://api.artia.com
VITE_ARTIA_API_TOKEN=seu-token-aqui
```

### 3. Deploy na Vercel

**Opção A - Via Dashboard:**
1. Acesse [vercel.com/new](https://vercel.com/new)
2. Importe seu repositório
3. Configure:
   - **Framework**: Vite
   - **Root Directory**: `artia-system/frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Adicione variáveis de ambiente:
   - `VITE_ARTIA_API_URL`
   - `VITE_ARTIA_API_TOKEN`
5. Deploy!

**Opção B - Via CLI:**
```bash
cd frontend

# Login
vercel login

# Deploy
vercel

# Adicionar variáveis
vercel env add VITE_ARTIA_API_URL
vercel env add VITE_ARTIA_API_TOKEN

# Deploy produção
vercel --prod
```

## ✅ Pronto!

Seu app estará em: `https://seu-app.vercel.app`

## 💰 Custo

**Total: $0/mês** 🎉

- Vercel Free Tier: $0
- Sem backend: $0
- Sem banco de dados: $0

## 🔧 Configurações Adicionais

### Custom Domain

1. Vercel Dashboard > Settings > Domains
2. Adicione: `artia.seudominio.com`
3. Configure DNS conforme instruções

### Cache

O app já está configurado para:
- Cache de projetos: 24 horas
- Cache de atividades: 24 horas
- Dados locais: Permanente (até exportar)

### Atualizar Token Artia

```bash
vercel env rm VITE_ARTIA_API_TOKEN
vercel env add VITE_ARTIA_API_TOKEN
vercel --prod
```

## 📱 Uso

1. Acesse o app
2. Projetos são carregados da API Artia
3. Crie seus apontamentos
4. Exporte CSV/XLSX quando quiser
5. Limpe eventos locais após exportar

## 🐛 Troubleshooting

### "Erro ao buscar projetos"
- Verifique se token Artia está correto
- Confirme que token tem permissões necessárias
- Teste token diretamente na API Artia

### "Cache não atualiza"
- Clique em "Atualizar Projetos" no app
- Ou limpe cache do navegador (F12 > Application > Clear Storage)

### "Dados perdidos"
- Dados ficam apenas no navegador
- Exporte regularmente!
- Não limpe cache do navegador sem exportar antes

## 📚 Documentação

- [API Artia](https://artia.movidesk.com/kb/pt-br/article/506837/03-api)
- [Vercel Docs](https://vercel.com/docs)
- `ARCHITECTURE_SIMPLIFIED.md` - Arquitetura detalhada

---

**Simples, rápido e gratuito!** 🎊
