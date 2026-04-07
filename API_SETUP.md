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
