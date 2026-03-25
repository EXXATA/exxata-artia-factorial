# Supabase e autenticacao Microsoft

Este backend usa Supabase para banco PostgreSQL e para autenticacao. O unico fluxo oficial de acesso do produto e Microsoft corporativo via Supabase Auth.

## O que configurar

### Variaveis de ambiente

Copie `backend/.env.example` para `backend/.env` e preencha:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MICROSOFT_ALLOWED_DOMAIN=exxata.com.br
MICROSOFT_ALLOWED_TENANT_ID=
```

`SUPABASE_SERVICE_ROLE_KEY` e obrigatoria para reconciliacao de usuarios e outras operacoes administrativas.

### Provider Microsoft/Azure no Supabase

1. Habilite o provider Microsoft no dashboard do Supabase Auth.
2. Configure a aplicacao Azure com os redirect URIs do frontend.
3. Garanta que o callback do app aponte para `/auth/callback`.

Exemplo local:

```text
http://localhost:5173/auth/callback
```

## Migrations

As migrations SQL ficam em `backend/supabase/migrations`.

Para aplicar:

```bash
supabase db push
```

A migration `20260324190000_auth_pending_and_cleanup.sql` faz tres ajustes importantes:

- torna `public.users.artia_user_id` anulavel
- remove a coluna legada `password_hash`
- atualiza o trigger `handle_auth_user_profile` para reconciliar primeiro por email

## Contrato de autenticacao

O frontend autentica no Supabase e depois consulta:

```http
GET /api/v1/auth/me
Authorization: Bearer <supabase-access-token>
```

O backend valida:

- sessao Supabase
- provider Microsoft/Azure
- dominio corporativo permitido
- tenant permitido, quando configurado
- estado de provisionamento do perfil local

## Respostas de bloqueio

### `403 AUTH_PROVISIONING_PENDING`

Retornada quando o usuario autenticado ainda nao possui provisionamento funcional suficiente para usar o app. Hoje o requisito minimo e `factorialEmployeeId`.

Payload esperado:

```json
{
  "success": false,
  "code": "AUTH_PROVISIONING_PENDING",
  "message": "Acesso pendente de provisionamento.",
  "data": {
    "missing": ["factorial_employee_id"],
    "canRetry": true
  }
}
```

### `403 USER_PROFILE_RECONCILIATION_REQUIRED`

Retornada quando existe um perfil local encontrado por email, mas com `id` diferente do `auth.user.id`. Esse caso deve ser tratado por reconciliacao controlada, sem reescrever IDs historicos automaticamente.

## Reconciliacao de usuarios

Use o script abaixo primeiro em `dry-run`:

```bash
npm run reconcile:auth-users
```

Para provisionar apenas os usuarios sem `auth.user`, rode:

```bash
npm run reconcile:auth-users -- --apply
```

O relatorio informa:

- `aligned`
- `missingAuthUser`
- `conflictingIds`
- `skipped`
- `provisioned`

## Observacoes importantes

- O backend nao usa JWT proprio.
- Login/cadastro por senha nao faz mais parte do runtime oficial.
- `artiaUserId` nao bloqueia login; ele e tratado como enriquecimento operacional.
- A tela `/access-pending` no frontend segura usuarios autenticados no Microsoft/Supabase, mas ainda nao liberados para as rotas privadas.
