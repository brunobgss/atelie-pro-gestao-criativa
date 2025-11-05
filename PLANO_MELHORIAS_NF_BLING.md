# 📋 Plano de Melhorias - Sistema de Notas Fiscais (Estilo Bling)

## ✅ Compatibilidade com Todos os Regimes Tributários

### Status Atual:
- ✅ **Simples Nacional**: CST 102 (implementado)
- ✅ **MEI**: Usa Simples Nacional (CST 102) - **JÁ FUNCIONA!**
- ✅ **Simples Nacional com Excesso**: CST 102 (implementado)
- ✅ **Regime Normal**: CST 41 (implementado)

**IMPORTANTE**: MEI é tecnicamente Simples Nacional, então **já está funcionando**! O CST 102 é o correto para ambos.

## 🎯 Funcionalidades do Bling que vamos implementar:

### 1. **Página de Gestão de Notas Fiscais** (Prioridade Alta)
- Listagem completa de todas as notas emitidas
- Filtros por status, data, cliente, tipo
- Busca rápida
- Visualização em cards/tabela
- Ações rápidas (visualizar, cancelar, reenviar)

### 2. **Suporte a Múltiplos Itens** (Prioridade Alta)
- Permitir adicionar vários produtos na mesma nota
- Cada item com NCM, CST, quantidade, valor específico
- Cálculo automático de totais

### 3. **Configuração de Produtos Fiscais** (Prioridade Média)
- Cadastro de produtos com NCM/CST personalizado
- Reutilização de produtos em múltiplas notas
- Configuração por produto (não apenas global)

### 4. **Funcionalidades Avançadas** (Prioridade Média)
- Cancelamento de notas (já implementado, melhorar UI)
- Carta de Correção Eletrônica (já na API, adicionar UI)
- Reenvio de email para cliente
- Download em lote
- Relatórios e estatísticas

### 5. **Tipos de Documento** (Prioridade Baixa)
- NFCe (Nota Fiscal ao Consumidor Eletrônica)
- NFSe (Nota Fiscal de Serviços Eletrônica)
- Detecção automática baseada no tipo de operação

## 📊 Interface Estilo Bling

### Características principais:
- Dashboard de notas fiscais
- Cards informativos (total emitido, pendentes, etc.)
- Filtros avançados
- Ações em massa
- Visualização detalhada
- Timeline de status

## 🚀 Próximos Passos

1. ✅ Criar tabela de produtos fiscais
2. ⏳ Criar página de gestão de notas
3. ⏳ Melhorar interface de emissão (múltiplos itens)
4. ⏳ Adicionar funcionalidades de cancelamento/correção na UI

