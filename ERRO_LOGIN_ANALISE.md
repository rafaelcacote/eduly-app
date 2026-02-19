# Análise do Erro de Login

## Erro: ERR_CONNECTION_TIMED_OUT

### Problema Atual

O erro que você está recebendo indica um problema de **conexão com o servidor**:

```
POST http://192.168.1.8:8000/api/mobile/login net::ERR_CONNECTION_TIMED_OUT
```

### O que significa?

A aplicação não consegue estabelecer conexão com o servidor Laravel em `http://192.168.1.8:8000`. Isso pode acontecer por vários motivos:

1. **Servidor não está rodando** - O Laravel não está em execução
2. **IP incorreto** - O IP `192.168.1.8` pode ter mudado
3. **Porta incorreta** - O servidor pode estar rodando em outra porta
4. **Firewall bloqueando** - O firewall pode estar bloqueando a conexão
5. **Servidor não acessível na rede** - Problemas de rede local

### Como Resolver

#### 1. Verificar se o servidor Laravel está rodando

No terminal do servidor Laravel, execute:
```bash
php artisan serve --host=0.0.0.0 --port=8000
```

Ou se estiver usando outro método:
```bash
# Verificar se a porta 8000 está em uso
netstat -ano | findstr :8000  # Windows
lsof -i :8000                 # Mac/Linux
```

#### 2. Verificar o IP correto do servidor

**No servidor Laravel**, execute:

**Windows:**
```bash
ipconfig
```
Procure pelo IP do adaptador ativo (geralmente "Adaptador Ethernet" ou "Wi-Fi"). Exemplo: `192.168.1.100`

**Mac/Linux:**
```bash
ifconfig
# ou
ip addr
```

#### 3. Atualizar a URL da API no app

Você tem duas opções:

**Opção A: Criar arquivo `.env` (Recomendado)**

Crie um arquivo `.env` na raiz do projeto:
```env
EXPO_PUBLIC_API_URL=http://SEU_IP_AQUI:8000
```

Exemplo:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000
```

**Opção B: Editar `config/api.ts`**

Edite o arquivo `config/api.ts` e altere o IP:
```typescript
export const API_CONFIG = {
    BASE_URL: 'http://192.168.1.100:8000', // Use o IP correto do servidor
    TIMEOUT: 30000,
};
```

#### 4. Verificar firewall

Certifique-se de que a porta 8000 está liberada no firewall do servidor.

**Windows:**
```powershell
# Permitir porta 8000 no firewall
New-NetFirewallRule -DisplayName "Laravel Dev Server" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
```

#### 5. Testar a conexão

Após configurar, teste se o servidor está acessível:

1. Abra o navegador no dispositivo/emulador
2. Acesse: `http://192.168.1.8:8000` (ou o IP que você configurou)
3. Se aparecer uma página do Laravel, a conexão está funcionando

#### 6. Verificar CORS no Laravel

Certifique-se de que o Laravel está configurado para aceitar requisições do app:

**config/cors.php:**
```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_origins' => ['*'], // Em produção, use apenas os domínios permitidos
'allowed_methods' => ['*'],
'allowed_headers' => ['*'],
'supports_credentials' => true,
```

### Melhorias Implementadas

Melhorei o tratamento de erros no app para:

1. **Detectar erros de timeout** - O app agora identifica especificamente erros de conexão timeout
2. **Mensagens mais claras** - Mostra a URL que está tentando conectar
3. **Logs para debug** - Adiciona logs no console para facilitar diagnóstico

---

## Erro Anterior: Tabela personal_access_tokens não existe

### Problema Identificado

O erro que você estava recebendo indicava um problema de **configuração no backend (Laravel)**:

```
SQLSTATE[42P01]: Undefined table: 7 ERRO: relação "personal_access_tokens" não existe
```

### O que significa?

A tabela `personal_access_tokens` não existe no banco de dados. Esta tabela é criada pelo **Laravel Sanctum** e é necessária para autenticação via tokens.

## Causa

O Laravel Sanctum não foi configurado corretamente no backend. As migrations do Sanctum não foram executadas no banco de dados.

## Solução (Backend)

Você precisa executar as migrations do Laravel Sanctum no seu projeto Laravel:

### 1. Instalar/Publicar as migrations do Sanctum (se ainda não foi feito)

```bash
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
```

### 2. Executar as migrations

```bash
php artisan migrate
```

Isso criará a tabela `personal_access_tokens` no banco de dados.

### 3. Verificar se o Sanctum está configurado

Certifique-se de que o `SanctumServiceProvider` está registrado no arquivo `config/app.php`:

```php
'providers' => [
    // ...
    Laravel\Sanctum\SanctumServiceProvider::class,
],
```

### 4. Verificar o modelo User

O modelo `User` deve usar o trait `HasApiTokens`:

```php
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;
    // ...
}
```

## Melhorias Implementadas no Frontend

Melhorei o tratamento de erros no app mobile para:

1. **Detectar erros de configuração do backend** - O app agora identifica quando a tabela `personal_access_tokens` não existe e mostra uma mensagem clara ao usuário
2. **Mensagens de erro mais amigáveis** - Erros técnicos são traduzidos para mensagens que o usuário pode entender
3. **Tratamento de diferentes tipos de erro**:
   - Erros de conexão
   - Erros de autenticação (401)
   - Erros de servidor (500+)
   - Erros de banco de dados
   - Erros de validação

## Arquivos Modificados

- `services/api.ts` - Melhor tratamento de erros HTTP
- `services/auth.ts` - Validação adicional da resposta de login

## Próximos Passos

1. **Execute as migrations no backend** (veja Solução acima)
2. **Teste o login novamente** - O erro deve desaparecer
3. Se o problema persistir, verifique:
   - Se o banco de dados está acessível
   - Se as credenciais do banco estão corretas no `.env` do Laravel
   - Se o Sanctum está instalado: `composer require laravel/sanctum`

## Mensagem que o Usuário Verá Agora

Quando o erro ocorrer, o usuário verá:

> "Erro de configuração do servidor. A tabela de autenticação não foi criada. Entre em contato com o suporte técnico."

Isso é mais claro do que mostrar o erro SQL completo.
