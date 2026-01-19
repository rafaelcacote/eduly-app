# Análise do Erro de Login

## Problema Identificado

O erro que você está recebendo indica um problema de **configuração no backend (Laravel)**, não no app mobile:

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
