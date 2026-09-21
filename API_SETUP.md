# Configuração da API

## URL da API

Para configurar a URL da API, você tem duas opções:

### Opção 1: Variável de Ambiente (Recomendado)

Crie um arquivo `.env` na raiz do projeto:

```env
EXPO_PUBLIC_API_URL=http://seu-ip-local:8000
```

**Para desenvolvimento local**, você precisa usar o IP da sua máquina (não `localhost`):

- **Windows**: Execute `ipconfig` no terminal e use o IP do adaptador ativo (ex: `192.168.1.100`)
- **Mac/Linux**: Execute `ifconfig` ou `ip addr` e use o IP da sua interface de rede

Exemplo:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000
```

### Opção 2: Editar arquivo de configuração

Edite o arquivo `config/api.ts` e altere a `BASE_URL`:

```typescript
export const API_CONFIG = {
  BASE_URL: 'http://192.168.1.100:8000', // Altere para seu IP/URL
  TIMEOUT: 30000,
};
```

## CORS no Laravel

Certifique-se de que o Laravel está configurado para aceitar requisições do app mobile:

**config/cors.php**:
```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_origins' => ['*'], // Em produção, use apenas os domínios permitidos
'allowed_methods' => ['*'],
'allowed_headers' => ['*'],
'supports_credentials' => true,
```

## Estrutura de Autenticação

### Login
- **Endpoint**: `POST /api/mobile/login`
- **Body**: 
  ```json
  {
    "cpf": "12345678909",
    "password": "senha123"
  }
  ```
- **Resposta**:
  ```json
  {
    "token": "1|...",
    "user": {
      "id": "...",
      "nome_completo": "...",
      "email": "...",
      "cpf": "12345678909",
      "telefone": "...",
      "avatar_url": null,
      "type": "teacher" // ou "responsavel"
    }
  }
  ```

### Alterar senha (autenticado)
- **Endpoint**: `PUT /api/mobile/me/password`
- **Body**:
  ```json
  {
    "current_password": "senhaAtual",
    "password": "NovaSenha123!",
    "password_confirmation": "NovaSenha123!"
  }
  ```

### Esqueci a senha
- **Endpoint**: `POST /api/mobile/forgot-password`
- **Body**:
  ```json
  {
    "email": "usuario@email.com"
  }
  ```
- **Resposta**: `{ "message": "..." }` — envia e-mail com link de redefinição

### Redefinir senha
- **Endpoint**: `POST /api/mobile/reset-password`
- **Body**:
  ```json
  {
    "email": "usuario@email.com",
    "token": "token-do-email",
    "password": "NovaSenha123!",
    "password_confirmation": "NovaSenha123!"
  }
  ```

### Uso do Token

O token é automaticamente incluído nas requisições através do header:
```
Authorization: Bearer {token}
```

## Como usar

1. Configure a URL da API (veja acima)
2. Execute o app: `npm start` ou `expo start`
3. Na tela de login, insira CPF e senha
4. O token será salvo automaticamente no AsyncStorage
5. As próximas requisições usarão o token automaticamente

## Arquivos Criados

- `config/api.ts` - Configuração da URL da API
- `services/api.ts` - Cliente HTTP base
- `services/auth.ts` - Serviço de autenticação
- `context/AuthContext.tsx` - Contexto React para gerenciar autenticação
- `app/login.tsx` - Tela de login atualizada para usar CPF e API

## Documentos (responsável ↔ secretaria)

Módulo mobile exclusivo do **responsável**. A secretaria analisa e responde no **painel web** (fora deste app).

### Tipos

| `tipo` | Origem | Descrição |
|--------|--------|-----------|
| `atestado` | Pai (app) | Atestado médico com período de falta + anexo |
| `pedido_declaracao` | Pai (app) | Pedido de declaração à escola |
| `documento_escola` | Secretaria (web) | Documento enviado ao pai |

### Status

`enviado` → `em_analise` → `aprovado` | `recusado` | `atendido`  
Documento da escola: `disponivel`  
Também: `cancelado`

### Categorias de declaração (`categoria_declaracao`)

`matricula` | `frequencia` | `transferencia` | `conclusao` | `outro`

### Endpoints

#### Listar documentos do aluno
- **Endpoint**: `GET /api/mobile/documentos?aluno_id={uuid}`
- **Resposta**: array de documentos (ou `{ data: [...] }` / `{ documentos: [...] }`)

#### Detalhe
- **Endpoint**: `GET /api/mobile/documentos/{id}`
- **Resposta**: objeto documento (ou `{ documento: {...} }` / `{ data: {...} }`)

#### Criar atestado (multipart)
- **Endpoint**: `POST /api/mobile/documentos`
- **Content-Type**: `multipart/form-data`
- **Campos**:
  - `aluno_id` (string)
  - `tipo` = `atestado`
  - `titulo` (opcional)
  - `descricao` (opcional)
  - `data_inicio` (`YYYY-MM-DD`)
  - `data_fim` (`YYYY-MM-DD`)
  - `anexo` (arquivo PDF/JPG/PNG, máx. 10 MB)

#### Criar pedido de declaração
- **Endpoint**: `POST /api/mobile/documentos`
- **JSON** (sem anexo):
  ```json
  {
    "aluno_id": "...",
    "tipo": "pedido_declaracao",
    "categoria_declaracao": "matricula",
    "titulo": "Declaração de matrícula",
    "descricao": null
  }
  ```
- Ou **multipart** com os mesmos campos + `anexo` opcional.

#### Upload de anexo em documento existente
- **Endpoint**: `POST /api/mobile/documentos/{id}/anexo`
- **Content-Type**: `multipart/form-data`
- **Campo**: `anexo`

### Campos do documento

```json
{
  "id": "...",
  "aluno_id": "...",
  "tipo": "atestado",
  "status": "enviado",
  "titulo": "Atestado médico",
  "descricao": null,
  "data_inicio": "2026-09-10",
  "data_fim": "2026-09-12",
  "categoria_declaracao": null,
  "anexo_url": "https://.../storage/...",
  "anexo_resposta_url": null,
  "motivo_recusa": null,
  "criado_em": "2026-09-19T14:00:00Z",
  "atualizado_em": "2026-09-19T14:00:00Z"
}
```

### Push notification

Ao mudar status ou enviar documento ao pai, notificar com:

```json
{
  "type": "documento",
  "documentoId": "..."
}
```

O app abre `/documento-detail` (ou `/documentos` se não houver id).

## Financeiro (responsável — somente leitura)

Módulo mobile exclusivo do **responsável** para acompanhar cobranças do aluno vinculado. A escola cadastra mensalidades/eventos e marca pagamento no **painel web**. O app **não** marca como pago, não envia comprovante e não processa gateway.

Entrada: atalho na home (`/financeiro`), no mesmo padrão de Documentos.

### Endpoints

#### Listar cobranças do aluno
- **Endpoint**: `GET /api/mobile/students/{alunoId}/cobrancas`
- **Query opcional**:
  - `status`: `pendente` | `pago` | `cancelado` | `atrasado`
  - `tipo`: `mensalidade` | `evento`
  - `ano`: number (ex.: `2026`)
  - `page`, `per_page` (1–100, default 20)
- **Resposta**: `{ cobrancas: [...], meta: { current_page, last_page, per_page, total } }`

#### Detalhe da cobrança
- **Endpoint**: `GET /api/mobile/students/{alunoId}/cobrancas/{cobrancaId}`
- **Resposta**: `{ cobranca: {...} }`

### Abas no app

| Aba | Query `status` |
|-----|----------------|
| Em aberto | `pendente` |
| Atrasadas | `atrasado` |
| Pagas | `pago` |

### Arquivos

- `services/financeiro.ts` — tipos + client
- `app/financeiro.tsx` — lista com filtros e paginação
- `app/financeiro-detail.tsx` — detalhe, abrir boleto PDF, copiar PIX

