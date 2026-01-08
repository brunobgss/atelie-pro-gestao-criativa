# 📥 INSTRUÇÕES DE IMPORTAÇÃO - ATELIÊ PRO

**Última atualização:** 2025-01-27  
**Status:** Instruções atualizadas com novas funcionalidades

---

## 📦 IMPORTAÇÃO DE PRODUTOS DO CATÁLOGO

### **Como Acessar:**
1. Acesse a página **Catálogo de Produtos** (`/catalogo`)
2. Clique no botão **"Importar Produtos"**

### **Formato do Arquivo CSV:**

#### **Colunas Obrigatórias:**
- **Nome** - Nome do produto (mínimo 3 caracteres)
- **Tipo** - Tipo do produto (valores válidos: `Uniforme`, `Personalizado`, `Bordado`, `Estampado`)

#### **Colunas Opcionais:**
- **Materiais** - Lista de materiais separados por vírgula (ex: "linha, tecido, botões")
- **Horas Trabalho** - Número de horas necessárias (ex: 1.5, 2.0)
- **Preço Unitário** - Preço do produto (ex: 25.00, 120.50)
- **Margem Lucro (%)** - Margem de lucro em porcentagem (0 a 100)
- **Item Estoque** ⭐ **NOVO** - Nome do item de estoque para vincular automaticamente
- **Quantidade por Unidade** ⭐ **NOVO** - Quantidade do item de estoque consumida por unidade do produto

### **Exemplo de CSV:**

```csv
Nome,Tipo,Materiais,Horas Trabalho,Preço Unitário,Margem Lucro (%),Item Estoque,Quantidade por Unidade
Camiseta Polo Bordada,Bordado,"linha, tecido",1.5,25.00,35,Tecido Algodão,2.5
Vestido Personalizado,Personalizado,"tecido, linha, zíper",3.0,120.00,40,Tecido Seda,3.0
Uniforme Escolar,Uniforme,"tecido, botões, etiqueta",2.0,85.00,30,Tecido Algodão,2.0
Camiseta Estampada,Estampado,"camiseta, tinta",0.5,35.00,50,Camiseta Básica,1.0
```

### **Vinculação Automática de Estoque** ⭐ **NOVO:**

**Como Funciona:**
- Se você incluir as colunas **"Item Estoque"** e **"Quantidade por Unidade"** no CSV:
  - O sistema busca automaticamente o item de estoque pelo nome
  - Vincula o item ao produto durante a importação
  - Configura a quantidade consumida por unidade

**Importante:**
- O nome do item de estoque deve corresponder **exatamente** ao nome cadastrado no estoque
- A busca é case-insensitive (não diferencia maiúsculas/minúsculas)
- Se o item não for encontrado, o produto será criado sem vínculo (não falha a importação)
- Você pode vincular o estoque manualmente depois se necessário

**Exemplo:**
```
Item Estoque: "Tecido Algodão"
Quantidade por Unidade: 2.5
```
Isso significa: cada unidade do produto consome 2.5 unidades do item "Tecido Algodão" do estoque.

### **Validações:**
- ✅ Nome obrigatório (mínimo 3 caracteres)
- ✅ Tipo obrigatório (deve ser um dos valores válidos)
- ✅ Preço unitário deve ser maior que zero
- ✅ Margem de lucro entre 0 e 100
- ✅ Horas de trabalho não pode ser negativo
- ✅ Quantidade por unidade deve ser maior que zero (se informada)

### **Limites:**
- **Máximo:** 1000 produtos por importação
- Se o arquivo tiver mais de 1000 produtos, apenas os primeiros 1000 serão processados

### **Duplicatas:**
- Produtos com o mesmo nome (case-insensitive) serão ignorados
- Você verá um aviso indicando quantos produtos duplicados foram encontrados

---

## 📦 IMPORTAÇÃO DE ITENS DE ESTOQUE

### **Como Acessar:**
1. Acesse a página **Estoque** (`/estoque`)
2. Clique no botão **"Importar Estoque"**

### **Formato do Arquivo CSV:**

#### **Colunas Obrigatórias:**
- **Nome** - Nome do item de estoque
- **Tipo** - Tipo do item (valores válidos: `Matéria-prima`, `Tecido`, `Produto acabado`)

#### **Colunas Opcionais:**
- **Quantidade** - Quantidade atual em estoque
- **Unidade** - Unidade de medida (ex: "unidades", "metros", "kg")
- **Quantidade Mínima** - Quantidade mínima para alertas
- **Categoria** - Categoria do item
- **Fornecedor** - Nome do fornecedor
- **Custo por Unidade** - Custo unitário do item
- **Observações** - Notas adicionais

### **Exemplo de CSV:**

```csv
Nome,Tipo,Quantidade,Unidade,Quantidade Mínima,Categoria,Fornecedor,Custo por Unidade,Observações
Tecido Algodão,Tecido,100,metros,20,Tecidos,Fornecedor ABC,15.50,Tecido de alta qualidade
Linha Branca,Matéria-prima,50,unidades,10,Aviamentos,Fornecedor XYZ,2.30,Linha 100% algodão
Botões Redondos,Matéria-prima,200,unidades,50,Aviamentos,Fornecedor ABC,0.50,Botões de plástico
```

### **Validações:**
- ✅ Nome obrigatório
- ✅ Tipo obrigatório (deve ser um dos valores válidos)
- ✅ Quantidade não pode ser negativa
- ✅ Quantidade mínima não pode ser negativa
- ✅ Custo por unidade não pode ser negativo

---

## 💡 DICAS IMPORTANTES

### **Preparação do Arquivo:**
1. **Salve como CSV (UTF-8)** para evitar problemas de acentuação
2. **Primeira linha** deve conter os cabeçalhos das colunas
3. **Não deixe linhas vazias** entre os dados
4. **Use vírgulas** para separar valores dentro de campos com aspas: `"linha, tecido"`
5. **Valores decimais** podem usar ponto ou vírgula: `25.50` ou `25,50`

### **Para Vinculação Automática de Estoque:**
1. **Certifique-se** que os itens de estoque já estão cadastrados
2. **Use o nome exato** do item de estoque (a busca não diferencia maiúsculas/minúsculas)
3. **Se o item não existir**, o produto será criado sem vínculo (você pode vincular depois)

### **Resolução de Problemas:**

**Erro: "Não foi encontrada uma coluna 'Nome'"**
- Verifique se a primeira linha contém os cabeçalhos
- O cabeçalho pode ser "Nome" ou "Name"

**Erro: "Tipo inválido"**
- Use exatamente: `Uniforme`, `Personalizado`, `Bordado`, `Estampado` (para produtos)
- Use exatamente: `Matéria-prima`, `Tecido`, `Produto acabado` (para estoque)

**Item de estoque não vinculado:**
- Verifique se o nome corresponde exatamente ao cadastrado
- Verifique se o item existe no estoque
- Você pode vincular manualmente depois usando "Vincular Estoque em Massa"

**Produtos duplicados:**
- O sistema ignora produtos com o mesmo nome
- Renomeie os produtos no CSV se quiser importá-los

---

## 🆕 NOVAS FUNCIONALIDADES (2025-01-27)

### ✅ **Vinculação Automática de Estoque na Importação**
- Agora você pode incluir colunas de estoque no CSV de importação de produtos
- O sistema vincula automaticamente durante a importação
- Economiza muito tempo para quem tem muitos produtos!

### ✅ **Exportação CSV do Catálogo**
- Botão "Exportar CSV" na página do catálogo
- Exporta todos os produtos com todos os campos
- Útil para backup e migração

### ✅ **Exclusão em Massa**
- Selecione múltiplos produtos ou itens de estoque
- Exclua todos de uma vez
- Confirmação antes de excluir

### ✅ **Vinculação de Estoque em Massa**
- Selecione múltiplos produtos
- Vincule o mesmo item de estoque a todos de uma vez
- Muito útil para produtos similares

---

## 📞 SUPORTE

Se tiver dúvidas ou problemas com a importação:
1. Verifique os erros exibidos na tela
2. Use o botão "Exportar Erros" para ver detalhes
3. Verifique se o formato do CSV está correto
4. Baixe o arquivo de exemplo para usar como base

---

**Documento atualizado com todas as novas funcionalidades implementadas em 2025-01-27**
