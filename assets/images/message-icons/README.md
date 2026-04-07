# Ícones de Mensagens

Este diretório contém os ícones personalizados para os tipos de mensagens.

## Como adicionar suas imagens:

1. Coloque suas imagens neste diretório com os seguintes nomes:
   - `informativo.png` - Para mensagens do tipo "informativo"
   - `atencao.png` - Para mensagens do tipo "atenção"
   - `aviso.png` - Para mensagens do tipo "aviso"
   - `lembrete.png` - Para mensagens do tipo "lembrete"
   - `outro.png` - Para mensagens do tipo "outro"

2. **Recomendações para as imagens:**
   - Formato: PNG (com transparência se necessário)
   - Tamanho recomendado: 24x24 pixels para lista, 32x32 pixels para detalhes
   - Resolução: 1x, 2x, 3x (para diferentes densidades de tela)
   - Fundo: Transparente (recomendado)

3. **Se as imagens não forem encontradas:**
   - O sistema usará automaticamente os emojis como fallback:
     - 📚 para informativo
     - ⚠️ para atenção
     - 🔔 para aviso
     - ⏰ para lembrete
     - 📄 para outro

## Estrutura de arquivos esperada:

```
assets/
  images/
    message-icons/
      informativo.png
      atencao.png
      aviso.png
      lembrete.png
      outro.png
```
