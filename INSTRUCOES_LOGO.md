# 📁 Instruções para Substituir Logo e Favicon

## 🎯 Arquivos para Substituir

### Logo Principal
**Arquivo**: `src/assets/logo-atelie-pro.png`
- **Dimensões recomendadas**: 200x60px (ou proporção similar)
- **Formato**: PNG
- **Fundo**: Transparente ou branco
- **Qualidade**: Alta resolução para boa exibição

### Favicon
**Arquivo**: `public/favicon.png`
- **Dimensões recomendadas**: 32x32px (ou múltiplos: 64x64, 128x128)
- **Formato**: PNG
- **Fundo**: Transparente
- **Nome**: Deve ser exatamente `favicon.png`

## 🔄 Como Substituir

1. **Para a Logo**:
   - Substitua o arquivo `src/assets/logo-atelie-pro.png` pela sua logo original
   - Mantenha o mesmo nome do arquivo
   - O sistema já está configurado para usar PNG

2. **Para o Favicon**:
   - Substitua o arquivo `public/favicon.png` pelo seu favicon original
   - Mantenha o mesmo nome do arquivo
   - O HTML já está configurado para usar PNG

## ✅ Verificação

Após substituir os arquivos:
1. Reinicie o servidor (`npm run dev`)
2. Verifique se a logo aparece nas páginas de Login e Cadastro
3. Verifique se a logo aparece na Sidebar
4. Verifique se o favicon aparece na aba do navegador

## 🎨 Cores do Tema

O sistema já está configurado com as cores da logo:
- **Roxo Profundo**: `#5A2D82`
- **Magenta Vibrante**: `#8A3AB8`
- **Rosa Vibrante**: `#E94E8F`

Essas cores são aplicadas automaticamente em:
- Gradientes de fundo
- Botões e elementos interativos
- Sidebar e navegação
- Cards e componentes

## 📝 Notas

- Os arquivos SVG temporários foram removidos
- Todas as referências foram atualizadas para PNG
- O sistema está pronto para receber suas imagens originais
- As cores do tema já estão alinhadas com a identidade visual


