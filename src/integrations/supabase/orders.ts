import { supabase } from "./client";
import { getCurrentEmpresaId } from "./auth-utils";
import { checkDatabaseHealth } from "./config";
import { listInventory } from "./inventory";
import { criarMovimentacao } from "./movimentacoes-estoque";
import { getProductById } from "./products";
import { getServico } from "./servicos";

export type OrderRow = {
  id: string;
  code: string;
  customer_name: string;
  type: string;
  description?: string | null;
  value: number;
  paid: number;
  delivery_date?: string | null;
  status: "Aguardando aprovação" | "Em produção" | "Finalizando" | "Pronto" | "Aguardando retirada" | "Entregue" | "Cancelado";
  file_url?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  observations?: string | null;
  created_at?: string;
  updated_at?: string;
  empresa_id?: string | null;
  personalizations?: OrderPersonalizationRow[];
};

export type OrderPersonalizationRow = {
  id: string;
  order_id: string;
  empresa_id: string;
  person_name: string;
  size?: string | null;
  quantity: number;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type OrderPersonalizationInput = {
  person_name: string;
  size?: string;
  quantity: number;
  notes?: string;
};

export async function listOrders(): Promise<OrderRow[]> {
  try {
    // Obter empresa_id do usuário logado
    const { data: userEmpresa } = await supabase
      .from("user_empresas")
      .select("empresa_id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
      .single();
    
    if (!userEmpresa?.empresa_id) {
      console.error("Usuário não tem empresa associada");
      return [];
    }
    
    // Verificar se o banco está funcionando
    const isDbWorking = await checkDatabaseHealth();
    
    if (!isDbWorking) {
      console.log("Banco não está funcionando");
      return [];
    }

    const { data, error } = await (supabase
      .from("atelie_orders" as any)
      .select("id, code, customer_name, customer_phone, type, description, value, paid, delivery_date, status, file_url, created_at")
      .eq("empresa_id", userEmpresa.empresa_id)
      .neq("status", "Cancelado") // Excluir pedidos cancelados das listagens
      .order("created_at", { ascending: false })
      .limit(500) as any); // Aumentar limite para garantir que todos os pedidos sejam buscados
    
    console.log("Pedidos encontrados no banco:", data?.length, "pedidos");
    if (data && data.length > 0) {
      console.log("Primeiro pedido:", { id: data[0].id, code: data[0].code });
    }
    if (error) throw error;
    return (data ?? []) as OrderRow[];
  } catch {
    return [];
  }
}

// Função para detectar se é UUID ou código
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function resolveOrderFilter(identifier: string): { column: "id" | "code"; value: string } {
  const value = identifier.trim();
  const column = isUUID(value) ? "id" : "code";
  return { column, value };
}

export async function getOrderByCode(code: string): Promise<OrderRow | null> {
  try {
    console.log("Buscando pedido por código:", code);
    
    if (!code || code.trim() === '') {
      console.error("Código do pedido inválido:", code);
      return null;
    }
    
    // Verificar se o banco está funcionando
    const isDbWorking = await checkDatabaseHealth();
    
    if (!isDbWorking) {
      console.log("Banco não está funcionando para pedido:", code);
      return null;
    }

    // Timeout de 10 segundos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 10000)
    );

    // Detectar se é UUID ou código e buscar adequadamente
    const isUuid = isUUID(code.trim());
    console.log("Tipo de identificador:", isUuid ? "UUID" : "Código");
    
    const fetchPromise = (supabase
      .from("atelie_orders" as any)
      .select("*")
      .eq(isUuid ? "id" : "code", code.trim())
      .maybeSingle() as any);

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
    
    if (error) {
      console.error("Erro ao buscar pedido:", error);
      return null;
    }
    
    if (!data) {
      console.log("Pedido não encontrado:", code);
      return null;
    }
    
    console.log("Pedido encontrado:", data);

    const personalizationsPromise = (supabase
      .from("atelie_order_personalizations" as any)
      .select("id, order_id, empresa_id, person_name, size, quantity, notes, created_at, updated_at")
      .eq("order_id", data.id)
      .order("created_at", { ascending: true }) as any);

    const personalizationsResult = await Promise.race([personalizationsPromise, timeoutPromise]) as any;
    const personalizationsError = personalizationsResult?.error;
    const personalizationsData = personalizationsResult?.data as OrderPersonalizationRow[] | undefined;

    if (personalizationsError) {
      console.error("Erro ao buscar personalizações do pedido:", personalizationsError);
      throw personalizationsError;
    }

    return {
      ...(data as OrderRow),
      personalizations: personalizationsData ?? [],
    };
  } catch (e: unknown) {
    console.error("Erro ao buscar pedido:", e);
    return null;
  }
}

// Função auxiliar para fazer baixa automática de estoque quando um produto do catálogo é vendido
export async function baixarEstoqueAutomatico(
  productId: string,
  quantity: number,
  orderCode: string,
  orderId: string, // ID do pedido (UUID) para origem_id
  empresaId: string
): Promise<void> {
  try {
    console.error(`📦 Iniciando baixa automática de estoque para produto ${productId}, quantidade: ${quantity}`);
    
    // Buscar produto do catálogo
    const product = await getProductById(productId);
    if (!product) {
      console.warn(`⚠️ Produto ${productId} não encontrado, pulando baixa de estoque`);
      return;
    }

    // Buscar todos os itens de estoque da empresa
    const allInventoryItems = await listInventory();
    if (allInventoryItems.length === 0) {
      console.log("ℹ️ Nenhum item de estoque encontrado, pulando baixa");
      return;
    }

    const itemsParaBaixar: Array<{ item: typeof allInventoryItems[0]; quantidade: number }> = [];

    // Parse JSON fields se necessário (Supabase pode retornar como string ou array)
    let productInventoryItemIds: string[] = [];
    let productInventoryQuantities: number[] = [];
    
    if (product.inventory_items) {
      if (typeof product.inventory_items === 'string') {
        try {
          productInventoryItemIds = JSON.parse(product.inventory_items);
        } catch (e) {
          console.warn("⚠️ Erro ao fazer parse de inventory_items:", e);
          productInventoryItemIds = [];
        }
      } else if (Array.isArray(product.inventory_items)) {
        productInventoryItemIds = product.inventory_items;
      }
    }
    
    if (product.inventory_quantities) {
      if (typeof product.inventory_quantities === 'string') {
        try {
          productInventoryQuantities = JSON.parse(product.inventory_quantities);
        } catch (e) {
          console.warn("⚠️ Erro ao fazer parse de inventory_quantities:", e);
          productInventoryQuantities = [];
        }
      } else if (Array.isArray(product.inventory_quantities)) {
        productInventoryQuantities = product.inventory_quantities;
      }
    }
    
    console.log("📋 Dados do produto:", {
      productId: product.id,
      productName: product.name,
      productInventoryItemIds,
      productInventoryQuantities,
      rawInventoryItems: product.inventory_items,
      rawInventoryQuantities: product.inventory_quantities,
      totalInventoryItemsAvailable: allInventoryItems.length
    });

    // PRIORIDADE 1: Usar vínculos explícitos se configurados
    if (productInventoryItemIds && Array.isArray(productInventoryItemIds) && productInventoryItemIds.length > 0) {
      console.log(`🔗 Usando vínculos explícitos de estoque (${productInventoryItemIds.length} item(ns))`);
      
      const quantities = productInventoryQuantities || [];
      
      for (let i = 0; i < productInventoryItemIds.length; i++) {
        const inventoryItemId = productInventoryItemIds[i];
        const quantityPerUnit = quantities[i] ?? 1; // Default: 1 unidade por produto
        
        const inventoryItem = allInventoryItems.find(item => item.id === inventoryItemId);
        
        if (inventoryItem) {
          const totalQuantity = quantity * quantityPerUnit;
          itemsParaBaixar.push({ 
            item: inventoryItem, 
            quantidade: totalQuantity 
          });
          console.log(`✅ Vínculo encontrado: ${inventoryItem.name} - ${totalQuantity} ${inventoryItem.unit} (${quantityPerUnit} por unidade × ${quantity} produtos)`);
        } else {
          console.warn(`⚠️ Item de estoque ${inventoryItemId} não encontrado (pode ter sido deletado)`);
        }
      }
    } else {
      // PRIORIDADE 2: Busca inteligente (fallback) - apenas se não houver vínculos
      console.log("🔍 Nenhum vínculo explícito encontrado, usando busca inteligente como fallback");
      
      // Função para normalizar strings (remover acentos, converter para minúsculas, remover espaços extras)
      const normalizeString = (str: string): string => {
        return str
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, " ")
          .trim();
      };

      // Função para extrair palavras-chave relevantes (ignorar artigos, preposições, números isolados)
      const extractKeywords = (text: string): string[] => {
        const stopWords = new Set(['de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos', 'a', 'o', 'e', 'ou', 'com', 'para', 'por', 'um', 'uma', 'uns', 'umas']);
        const normalized = normalizeString(text);
        const words = normalized.split(/\s+/).filter(word => 
          word.length > 2 && // Palavras com mais de 2 caracteres
          !stopWords.has(word) && // Não são stop words
          !/^\d+$/.test(word) // Não são apenas números
        );
        return words;
      };

      // Função para calcular similaridade entre duas strings (busca por palavras-chave)
      const calculateSimilarity = (str1: string, str2: string): number => {
        const words1 = extractKeywords(str1);
        const words2 = extractKeywords(str2);
        if (words1.length === 0 || words2.length === 0) return 0;
        
        const matches = words1.filter(word => 
          words2.some(w2 => w2.includes(word) || word.includes(w2))
        ).length;
        
        return matches / Math.max(words1.length, words2.length);
      };

      // 1. Tentar encontrar item de estoque com nome exato do produto (produto acabado)
      const produtoAcabado = allInventoryItems.find(
        item => normalizeString(item.name) === normalizeString(product.name) && item.item_type === "produto_acabado"
      );
      if (produtoAcabado) {
        itemsParaBaixar.push({ item: produtoAcabado, quantidade: quantity });
        console.log(`✅ Encontrado produto acabado: ${produtoAcabado.name}`);
      }

      // 2. Busca inteligente por palavras-chave no nome do produto
      if (itemsParaBaixar.length === 0) {
        const productKeywords = extractKeywords(product.name);
        console.log(`🔍 Palavras-chave extraídas do produto: ${productKeywords.join(", ")}`);
        
        // Buscar itens de estoque que contenham palavras-chave do produto
        const matchingItems = allInventoryItems
          .map(item => ({
            item,
            similarity: calculateSimilarity(product.name, item.name)
          }))
          .filter(({ similarity }) => similarity > 0.3) // Pelo menos 30% de similaridade
          .sort((a, b) => b.similarity - a.similarity); // Ordenar por maior similaridade
        
        // Adicionar os 3 itens mais similares (ou todos se forem menos de 3)
        for (const { item } of matchingItems.slice(0, 3)) {
          if (!itemsParaBaixar.find(i => i.item.id === item.id)) {
            itemsParaBaixar.push({ item, quantidade: quantity });
            console.log(`✅ Encontrado por palavras-chave: ${item.name} (similaridade: ${matchingItems.find(m => m.item.id === item.id)?.similarity.toFixed(2)})`);
          }
        }
      }

      // 3. Tentar encontrar itens de estoque que correspondam aos materiais do produto
      if (product.materials && Array.isArray(product.materials) && product.materials.length > 0) {
        for (const material of product.materials) {
          const materialNormalizado = normalizeString(material);
          
          // Mapeamento de sinônimos comuns
          const synonyms: Record<string, string[]> = {
            'tecido': ['pano', 'fabric', 'tecido', 'tela', 'malha', 'moletom', 'algodao'],
            'linha': ['fio', 'linha', 'thread', 'yarn'],
            'ziper': ['zíper', 'ziper', 'fecho', 'fechamento'],
            'botao': ['botão', 'botao', 'button'],
            'elastico': ['elástico', 'elastico', 'elastic'],
            'forro': ['forro', 'lining'],
            'avental': ['avental', 'apron'],
          };
          
          // Buscar item de estoque que tenha o nome do material ou sinônimos
          const itemMaterial = allInventoryItems.find(
            item => {
              const itemNameNormalizado = normalizeString(item.name);
              
              // Verificação direta
              if (itemNameNormalizado.includes(materialNormalizado) || 
                  materialNormalizado.includes(itemNameNormalizado)) {
                return true;
              }
              
              // Verificação por sinônimos
              for (const [key, syns] of Object.entries(synonyms)) {
                if (materialNormalizado.includes(key) || key.includes(materialNormalizado)) {
                  return syns.some(syn => 
                    itemNameNormalizado.includes(syn) || syn.includes(itemNameNormalizado)
                  );
                }
              }
              
              return false;
            }
          );

          if (itemMaterial && !itemsParaBaixar.find(i => i.item.id === itemMaterial.id)) {
            // Para materiais, baixar a quantidade vendida (assumindo 1 unidade de material por produto)
            itemsParaBaixar.push({ item: itemMaterial, quantidade: quantity });
            console.log(`✅ Encontrado material: ${itemMaterial.name} (${material})`);
          }
        }
      }

      // 4. Busca por tipo de produto (ex: "blusão" → busca "tecido" relacionado)
      if (itemsParaBaixar.length === 0) {
        const productNameNormalized = normalizeString(product.name);
        const productTypeKeywords = ['blusao', 'blusa', 'camisa', 'calca', 'calça', 'vestido', 'saia', 'short', 'bermuda', 'moletom'];
        
        const hasProductType = productTypeKeywords.some(keyword => productNameNormalized.includes(keyword));
        
        if (hasProductType) {
          // Se é um produto de roupa, buscar por "tecido" no estoque
          const tecidoItem = allInventoryItems.find(item => {
            const itemName = normalizeString(item.name);
            return itemName.includes('tecido') || 
                   itemName.includes('pano') || 
                   itemName.includes('fabric') ||
                   itemName.includes('malha') ||
                   itemName.includes('moletom');
          });
          
          if (tecidoItem && !itemsParaBaixar.find(i => i.item.id === tecidoItem.id)) {
            itemsParaBaixar.push({ item: tecidoItem, quantidade: quantity });
            console.log(`✅ Encontrado tecido genérico para produto de roupa: ${tecidoItem.name}`);
          }
        }
      }
    }

    // Criar movimentações de saída para cada item encontrado
    if (itemsParaBaixar.length === 0) {
      console.log("ℹ️ Nenhum item de estoque correspondente encontrado para baixa automática");
      console.log("💡 Dica: Configure vínculos explícitos no produto do catálogo para baixa automática precisa");
      console.log("📋 Informações do produto:", {
        productId: product.id,
        productName: product.name,
        hasInventoryItems: !!product.inventory_items,
        productInventoryItemIdsCount: productInventoryItemIds?.length || 0,
        materials: product.materials,
        inventoryItemsAvailable: allInventoryItems.length,
        inventoryItemsNames: allInventoryItems.map(i => i.name)
      });
      return;
    }

    console.log(`📝 Criando ${itemsParaBaixar.length} movimentação(ões) de saída...`);

    let successCount = 0;
    let errorCount = 0;

    for (const { item, quantidade } of itemsParaBaixar) {
      try {
        console.log(`🔄 Criando movimentação para: ${item.name} (${quantidade} ${item.unit})`);
        console.log(`📋 Dados da movimentação:`, {
          inventory_item_id: item.id,
          produto_id: productId,
          tipo_movimentacao: "saida",
          quantidade: quantidade,
          empresa_id: empresaId,
          orderCode: orderCode
        });
        
        const result = await criarMovimentacao({
          inventory_item_id: item.id,
          produto_id: productId,
          tipo_movimentacao: "saida",
          quantidade: quantidade,
          motivo: `Venda automática - Pedido ${orderCode} - Produto: ${product.name}`,
          origem: "pedido",
          origem_id: orderId, // Usar ID do pedido (UUID) como origem_id
        });

        if (result.ok) {
          console.log(`✅ Baixa de estoque criada com sucesso: ${item.name} - ${quantidade} ${item.unit}`);
          if (result.data) {
            console.log(`📊 Dados da movimentação criada:`, {
              id: result.data.id,
              quantidade_anterior: result.data.quantidade_anterior,
              quantidade_atual: result.data.quantidade_atual,
              inventory_item: result.data.inventory_item
            });
          }
          successCount++;
        } else {
          console.error(`❌ Erro ao criar baixa para ${item.name}:`, result.error);
          errorCount++;
        }
      } catch (error: any) {
        console.error(`❌ Erro ao processar baixa para ${item.name}:`, error);
        console.error(`📋 Detalhes do erro:`, {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        errorCount++;
      }
    }

    console.log(`✅ Baixa automática de estoque concluída para pedido ${orderCode}`, {
      total: itemsParaBaixar.length,
      sucesso: successCount,
      erros: errorCount
    });
  } catch (error: any) {
    console.error("❌ Erro na baixa automática de estoque:", error);
    // Não falhar o pedido por causa de erro na baixa de estoque
  }
}

// Função auxiliar para fazer baixa automática de estoque quando um serviço rápido é realizado
async function baixarEstoqueServico(
  servicoId: string,
  quantity: number,
  orderCode: string,
  orderId: string, // ID do pedido (UUID) para origem_id
  empresaId: string
): Promise<void> {
  try {
    console.log(`🔧 Iniciando baixa automática de estoque para serviço ${servicoId}, quantidade: ${quantity}`);
    
    // Buscar serviço
    const servico = await getServico(servicoId);
    if (!servico) {
      console.warn(`⚠️ Serviço ${servicoId} não encontrado, pulando baixa de estoque`);
      return;
    }

    // Buscar todos os itens de estoque da empresa
    const allInventoryItems = await listInventory();
    if (allInventoryItems.length === 0) {
      console.log("ℹ️ Nenhum item de estoque encontrado, pulando baixa");
      return;
    }

    const itemsParaBaixar: Array<{ item: typeof allInventoryItems[0]; quantidade: number }> = [];

    // Parse JSON fields se necessário
    let servicoInventoryItemIds: string[] = [];
    let servicoInventoryQuantities: number[] = [];
    
    if (servico.inventory_items) {
      if (typeof servico.inventory_items === 'string') {
        try {
          servicoInventoryItemIds = JSON.parse(servico.inventory_items);
        } catch (e) {
          console.warn("⚠️ Erro ao fazer parse de inventory_items:", e);
          servicoInventoryItemIds = [];
        }
      } else if (Array.isArray(servico.inventory_items)) {
        servicoInventoryItemIds = servico.inventory_items;
      }
    }
    
    if (servico.inventory_quantities) {
      if (typeof servico.inventory_quantities === 'string') {
        try {
          servicoInventoryQuantities = JSON.parse(servico.inventory_quantities);
        } catch (e) {
          console.warn("⚠️ Erro ao fazer parse de inventory_quantities:", e);
          servicoInventoryQuantities = [];
        }
      } else if (Array.isArray(servico.inventory_quantities)) {
        servicoInventoryQuantities = servico.inventory_quantities;
      }
    }
    
    console.log("📋 Dados do serviço:", {
      servicoId: servico.id,
      servicoNome: servico.nome,
      servicoInventoryItemIds,
      servicoInventoryQuantities,
      totalInventoryItemsAvailable: allInventoryItems.length
    });

    // Usar vínculos explícitos se configurados
    if (servicoInventoryItemIds && Array.isArray(servicoInventoryItemIds) && servicoInventoryItemIds.length > 0) {
      console.log(`🔗 Usando vínculos explícitos de estoque (${servicoInventoryItemIds.length} item(ns))`);
      
      const quantities = servicoInventoryQuantities || [];
      
      for (let i = 0; i < servicoInventoryItemIds.length; i++) {
        const inventoryItemId = servicoInventoryItemIds[i];
        const quantityPerService = quantities[i] ?? 1; // Default: 1 unidade por serviço
        
        const inventoryItem = allInventoryItems.find(item => item.id === inventoryItemId);
        
        if (inventoryItem) {
          const totalQuantity = quantity * quantityPerService;
          itemsParaBaixar.push({ 
            item: inventoryItem, 
            quantidade: totalQuantity 
          });
          console.log(`✅ Vínculo encontrado: ${inventoryItem.name} - ${totalQuantity} ${inventoryItem.unit} (${quantityPerService} por serviço × ${quantity} serviços)`);
        } else {
          console.warn(`⚠️ Item de estoque ${inventoryItemId} não encontrado (pode ter sido deletado)`);
        }
      }
    } else {
      // PRIORIDADE 2: Busca inteligente (fallback) - apenas se não houver vínculos
      console.log("🔍 Nenhum vínculo explícito encontrado, usando busca inteligente como fallback");
      
      // Função para normalizar strings (remover acentos, converter para minúsculas, remover espaços extras)
      const normalizeString = (str: string): string => {
        return str
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, " ")
          .trim();
      };

      // Função para extrair palavras-chave relevantes (ignorar artigos, preposições, números isolados)
      const extractKeywords = (text: string): string[] => {
        const stopWords = new Set(['de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos', 'a', 'o', 'e', 'ou', 'com', 'para', 'por', 'um', 'uma', 'uns', 'umas']);
        const normalized = normalizeString(text);
        const words = normalized.split(/\s+/).filter(word => 
          word.length > 2 && // Palavras com mais de 2 caracteres
          !stopWords.has(word) && // Não são stop words
          !/^\d+$/.test(word) // Não são apenas números
        );
        return words;
      };

      // Função para calcular similaridade entre duas strings (busca por palavras-chave)
      const calculateSimilarity = (str1: string, str2: string): number => {
        const words1 = extractKeywords(str1);
        const words2 = extractKeywords(str2);
        if (words1.length === 0 || words2.length === 0) return 0;
        
        const matches = words1.filter(word => 
          words2.some(w2 => w2.includes(word) || word.includes(w2))
        ).length;
        
        return matches / Math.max(words1.length, words2.length);
      };

      // 1. Busca inteligente por palavras-chave no nome do serviço
      const servicoKeywords = extractKeywords(servico.nome);
      console.log(`🔍 Palavras-chave extraídas do serviço: ${servicoKeywords.join(", ")}`);
      
      // Buscar itens de estoque que contenham palavras-chave do serviço
      const matchingItems = allInventoryItems
        .map(item => ({
          item,
          similarity: calculateSimilarity(servico.nome, item.name)
        }))
        .filter(({ similarity }) => similarity > 0.3) // Pelo menos 30% de similaridade
        .sort((a, b) => b.similarity - a.similarity); // Ordenar por maior similaridade
      
      // Adicionar os 3 itens mais similares (ou todos se forem menos de 3)
      for (const { item } of matchingItems.slice(0, 3)) {
        if (!itemsParaBaixar.find(i => i.item.id === item.id)) {
          itemsParaBaixar.push({ item, quantidade: quantity });
          console.log(`✅ Encontrado por palavras-chave: ${item.name} (similaridade: ${matchingItems.find(m => m.item.id === item.id)?.similarity.toFixed(2)})`);
        }
      }

      // 2. Busca por tipo de serviço comum (ex: "troca de zíper" → busca "zíper")
      if (itemsParaBaixar.length === 0) {
        const servicoNameNormalized = normalizeString(servico.nome);
        const serviceTypeKeywords: Record<string, string[]> = {
          'ziper': ['zíper', 'ziper', 'fecho', 'fechamento'],
          'botao': ['botão', 'botao', 'button'],
          'elastico': ['elástico', 'elastico', 'elastic'],
          'forro': ['forro', 'lining'],
          'bainha': ['bainha', 'hem'],
          'costura': ['costura', 'sewing', 'linha', 'fio'],
        };
        
        for (const [serviceType, inventoryKeywords] of Object.entries(serviceTypeKeywords)) {
          if (servicoNameNormalized.includes(serviceType)) {
            const matchingItem = allInventoryItems.find(item => {
              const itemName = normalizeString(item.name);
              return inventoryKeywords.some(keyword => 
                itemName.includes(keyword) || keyword.includes(itemName)
              );
            });
            
            if (matchingItem && !itemsParaBaixar.find(i => i.item.id === matchingItem.id)) {
              itemsParaBaixar.push({ item: matchingItem, quantidade: quantity });
              console.log(`✅ Encontrado item por tipo de serviço: ${matchingItem.name} (serviço: ${serviceType})`);
              break; // Encontrou um item, pode parar
            }
          }
        }
      }
    }

    // Criar movimentações de saída para cada item encontrado
    if (itemsParaBaixar.length === 0) {
      console.log("ℹ️ Nenhum item de estoque correspondente encontrado para baixa automática");
      return;
    }

    console.log(`📝 Criando ${itemsParaBaixar.length} movimentação(ões) de saída...`);

    let successCount = 0;
    let errorCount = 0;

    for (const { item, quantidade } of itemsParaBaixar) {
      try {
        console.log(`🔄 Criando movimentação para: ${item.name} (${quantidade} ${item.unit})`);
        console.log(`📋 Dados da movimentação:`, {
          inventory_item_id: item.id,
          servico_id: servicoId,
          tipo_movimentacao: "saida",
          quantidade: quantidade,
          empresa_id: empresaId,
          orderCode: orderCode
        });
        
        const result = await criarMovimentacao({
          inventory_item_id: item.id,
          tipo_movimentacao: "saida",
          quantidade: quantidade,
          motivo: `Serviço realizado - Pedido ${orderCode} - Serviço: ${servico.nome}`,
          origem: "pedido",
          origem_id: orderId, // Usar ID do pedido (UUID) como origem_id
        });

        if (result.ok) {
          console.log(`✅ Baixa de estoque criada com sucesso: ${item.name} - ${quantidade} ${item.unit}`);
          if (result.data) {
            console.log(`📊 Dados da movimentação criada:`, {
              id: result.data.id,
              quantidade_anterior: result.data.quantidade_anterior,
              quantidade_atual: result.data.quantidade_atual,
              inventory_item: result.data.inventory_item
            });
          }
          successCount++;
        } else {
          console.error(`❌ Erro ao criar baixa para ${item.name}:`, result.error);
          errorCount++;
        }
      } catch (error: any) {
        console.error(`❌ Erro ao processar baixa para ${item.name}:`, error);
        console.error(`📋 Detalhes do erro:`, {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        errorCount++;
      }
    }

    console.log(`✅ Baixa automática de estoque concluída para pedido ${orderCode}`, {
      total: itemsParaBaixar.length,
      sucesso: successCount,
      erros: errorCount
    });
  } catch (error: any) {
    console.error("❌ Erro na baixa automática de estoque do serviço:", error);
    // Não falhar o pedido por causa de erro na baixa de estoque
  }
}

export async function createOrder(input: {
  code?: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  type: string;
  description: string;
  value: number;
  paid?: number;
  delivery_date?: string;
  status?: string;
  observations?: string;
  file_url?: string;
  personalizations?: OrderPersonalizationInput[];
  product_id?: string; // ID do produto do catálogo (quando type === "catalogo") - DEPRECATED: usar products
  quantity?: number; // Quantidade vendida - DEPRECATED: usar products
  products?: Array<{ id: string; quantity: number }>; // Lista de produtos do catálogo com suas quantidades
  services?: Array<{ id: string; quantity: number }>; // Lista de serviços rápidos com suas quantidades
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const code = input.code ?? generateOrderCode();
    console.error("📝 Criando pedido - Dados recebidos:", {
      code,
      type: input.type,
      products: input.products,
      product_id: input.product_id,
      quantity: input.quantity,
      services: input.services,
      productsCount: input.products?.length || 0
    });
    
    // Obter empresa_id do usuário logado
    const empresa_id = await getCurrentEmpresaId();
    
    const { data, error } = await (supabase
      .from("atelie_orders" as any)
      .insert({
        code,
        customer_name: input.customer_name,
        customer_phone: input.customer_phone ?? null,
        customer_email: input.customer_email ?? null,
        type: input.type,
        description: input.description,
        value: input.value,
        paid: input.paid ?? 0,
        delivery_date: input.delivery_date ?? null,
        status: input.status ?? "Aguardando aprovação",
        observations: input.observations ?? null,
        file_url: input.file_url ?? null,
        empresa_id
      })
      .select()
      .single() as any);

    if (error) {
      console.error("Erro ao criar pedido:", error);
      return { ok: false, error: (error as any)?.message || "Erro ao criar pedido" };
    }

    console.log("✅ Pedido criado com sucesso:", {
      id: data?.id,
      code: data?.code,
      type: data?.type
    });

    const orderData = data as any;
    
    console.error("🔍 DEBUG - Dados do pedido criado:", {
      orderId: orderData?.id,
      orderCode: orderData?.code,
      orderType: orderData?.type,
      inputType: input.type,
      inputProducts: input.products,
      inputProductId: input.product_id,
      inputQuantity: input.quantity,
      hasProducts: (input.products && input.products.length > 0) || (input.product_id && input.quantity)
    });
    if (input.personalizations?.length && orderData?.id) {
      const personalizations = input.personalizations
        .filter((p) => p.person_name?.trim())
        .map((p) => ({
          order_id: orderData.id,
          empresa_id,
          person_name: p.person_name.trim(),
          size: p.size?.trim() || null,
          quantity: p.quantity ?? 1,
          notes: p.notes?.trim() || null,
        }));

      if (personalizations.length) {
        const { error: personalizationsError } = await (supabase
          .from("atelie_order_personalizations" as any)
          .insert(personalizations) as any);

        if (personalizationsError) {
          console.error("Erro ao salvar personalizações do pedido:", personalizationsError);
        }
      }
    }

    // SINCRONIZAÇÃO: Criar receita imediatamente se houver valor pago
    if (input.paid && input.paid > 0 && orderData?.code) {
      console.log("Criando receita automaticamente para pedido:", orderData.code);
      try {
        const { error: receitaError } = await (supabase
          .from("atelie_receitas" as any)
          .insert({
            order_code: orderData.code,
            customer_name: input.customer_name || "Sem nome",
            description: `Pagamento do pedido ${orderData.code}`,
            amount: input.paid,
            payment_method: "Dinheiro",
            payment_date: new Date().toISOString().split('T')[0],
            status: "realizada",
            empresa_id: empresa_id,
            order_id: orderData.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as any));

        if (receitaError) {
          console.error("Erro ao criar receita automaticamente:", receitaError);
          // Não falhar aqui, apenas logar
        } else {
          console.log("Receita criada automaticamente com sucesso");
        }
      } catch (receitaErr: any) {
        console.error("Erro ao criar receita:", receitaErr);
        // Não falhar aqui, apenas logar
      }
    }

    // BAIXA AUTOMÁTICA DE ESTOQUE: Se for pedido do catálogo com produtos selecionados
    // Verificar se há produtos mesmo que o tipo não seja explicitamente "catalogo"
    const hasProducts = (input.products && input.products.length > 0) || (input.product_id && input.quantity);
    const shouldProcessInventory = input.type === "catalogo" || hasProducts;
    
    console.error("🔍 Verificando baixa de estoque:", {
      type: input.type,
      hasProducts,
      products: input.products,
      product_id: input.product_id,
      quantity: input.quantity,
      shouldProcessInventory
    });
    
    if (shouldProcessInventory) {
      // Priorizar lista de produtos (nova forma)
      const productsToProcess = input.products && input.products.length > 0
        ? input.products
        : (input.product_id && input.quantity ? [{ id: input.product_id, quantity: input.quantity }] : []);
      
      if (productsToProcess.length > 0) {
        console.error("🚀 Iniciando baixa automática de estoque para pedido do catálogo", {
          type: input.type,
          products_count: productsToProcess.length,
          order_code: orderData.code,
          empresa_id,
          products: productsToProcess
        });

        // IMPORTANTE:
        // Não podemos "agendar" a baixa e retornar, porque telas como `NovoPedido`
        // redirecionam com `window.location.replace(...)` e isso mata Promises pendentes.
        // Então fazemos a baixa AQUI (com try/catch) antes de retornar.
        try {
          console.error("🔄 Executando baixa automática de estoque para todos os produtos...");

          let successCount = 0;
          let errorCount = 0;

          for (const product of productsToProcess) {
            try {
              await baixarEstoqueAutomatico(
                product.id,
                product.quantity,
                orderData.code,
                orderData.id, // Passar ID do pedido (UUID) para origem_id
                empresa_id
              );
              successCount++;
              console.error(`✅ Baixa de estoque concluída para produto ${product.id} (quantidade: ${product.quantity})`);
            } catch (error) {
              errorCount++;
              console.error(`❌ Erro na baixa de estoque para produto ${product.id}:`, error);
            }
          }

          console.error(`✅ Baixa automática de estoque concluída: ${successCount} sucesso(s), ${errorCount} erro(s)`);
        } catch (error) {
          console.error("❌ Erro na baixa automática de estoque (não crítico):", error);
          console.error("Stack trace:", (error as Error).stack);
        }
      } else {
        console.error("⚠️ Baixa automática não executada: nenhum produto especificado");
      }
    } else {
      console.error("⚠️ Baixa automática não executada:", {
        type: input.type,
        hasProducts,
        shouldProcessInventory
      });
    }

    // BAIXA AUTOMÁTICA DE ESTOQUE PARA SERVIÇOS RÁPIDOS
    if (input.services && input.services.length > 0) {
      console.log("🚀 Iniciando baixa automática de estoque para serviços rápidos", {
        services_count: input.services.length,
        order_code: orderData.code,
        empresa_id
      });

      try {
        console.log("🔄 Executando baixa automática de estoque para todos os serviços...");

        let successCount = 0;
        let errorCount = 0;

        for (const service of input.services) {
          try {
            await baixarEstoqueServico(
              service.id,
              service.quantity,
              orderData.code,
              orderData.id,
              empresa_id
            );
            successCount++;
            console.log(`✅ Baixa de estoque concluída para serviço ${service.id} (quantidade: ${service.quantity})`);
          } catch (error) {
            errorCount++;
            console.error(`❌ Erro na baixa de estoque para serviço ${service.id}:`, error);
          }
        }

        console.log(`✅ Baixa automática de estoque para serviços concluída: ${successCount} sucesso(s), ${errorCount} erro(s)`);
      } catch (error) {
        console.error("❌ Erro na baixa automática de estoque de serviços (não crítico):", error);
        console.error("Stack trace:", (error as Error).stack);
      }
    }

    return { ok: true, id: orderData.id };
  } catch (e: unknown) {
    console.error("Erro ao criar pedido:", e);
    return { ok: false, error: (e as any)?.message || "Erro ao criar pedido" };
  }
}

export async function updateOrderStatus(
  code: string,
  status?: OrderRow['status'],
  paid?: number,
  description?: string
): Promise<{ ok: boolean; data?: OrderRow; error?: string }> {
  try {
    console.log(`Atualizando pedido ${code}:`, { status, paid });
    
    if (!code || code.trim() === "") {
      console.error("Identificador do pedido inválido");
      return { ok: false, error: "Pedido inválido" };
    }

    // Verificar se o banco está funcionando
    const isDbWorking = await checkDatabaseHealth();

    if (!isDbWorking) {
      console.log("Banco não está funcionando");
      return { ok: false, error: "Banco não está funcionando" };
    }

    const { column, value } = resolveOrderFilter(code);

    // Preparar dados para atualização
    const updateData: Partial<OrderRow> & { updated_at: string } = {
      updated_at: new Date().toISOString()
    };

    if (status !== undefined) {
      updateData.status = status;
    }

    if (paid !== undefined) {
      updateData.paid = paid;
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    // Timeout de 5 segundos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 5000)
    );

    const updatePromise = (supabase
      .from("atelie_orders" as any)
      .update(updateData)
      .eq(column, value)
      .select()
      .single() as any);

    const { data, error } = await Promise.race([updatePromise, timeoutPromise]) as any;

    if (error) {
      console.error("Erro ao atualizar pedido:", error);
      return { ok: false, error: (error as any)?.message || "Erro ao atualizar pedido" };
    }
    
    if (!data) {
      console.error("Pedido não encontrado para atualização", { code, column, value });
      return { ok: false, error: "Pedido não encontrado" };
    }

    const updatedOrder = data as OrderRow;
    const effectiveOrderCode = updatedOrder.code;

    // Se o campo 'paid' foi alterado, atualizar também a tabela de receitas
    if (paid !== undefined) {
      console.log("Campo 'paid' foi alterado, atualizando tabela de receitas...");

      // Buscar se já existe receita para este pedido
      const { data: existingReceita } = await (supabase
        .from("atelie_receitas" as any)
        .select("id")
        .eq("order_code", effectiveOrderCode)
        .maybeSingle() as any);

      if (existingReceita) {
        // Atualizar receita existente
        const { error: updateReceitaError } = await (supabase
          .from("atelie_receitas" as any)
          .update({ 
            amount: paid,
            updated_at: new Date().toISOString()
          })
          .eq("order_code", effectiveOrderCode) as any);

        if (updateReceitaError) {
          console.error("Erro ao atualizar receita:", updateReceitaError);
          // Não falhar aqui, apenas logar
        } else {
          console.log("Receita atualizada com sucesso");
        }
      } else if (updatedOrder.empresa_id) {
        // Criar nova receita com todos os campos obrigatórios
        const { error: createReceitaError } = await (supabase
          .from("atelie_receitas" as any)
          .insert({
            order_code: effectiveOrderCode,
            customer_name: updatedOrder.customer_name || "Sem nome",
            description: `Pagamento do pedido ${effectiveOrderCode}`,
            amount: paid,
            payment_method: "Dinheiro",
            payment_date: new Date().toISOString().split('T')[0],
            status: paid > 0 ? "pago" : "pendente",
            empresa_id: updatedOrder.empresa_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as any));

        if (createReceitaError) {
          console.error("Erro ao criar receita:", createReceitaError);
          // Não falhar aqui, apenas logar
        } else {
          console.log("Receita criada com sucesso");
        }
      }
    }

    console.log("Pedido atualizado com sucesso:", updatedOrder);
    return { ok: true, data: updatedOrder };
  } catch (e: unknown) {
    console.error("Erro ao atualizar pedido:", e);
    return { ok: false, error: (e as any)?.message || "Erro ao atualizar pedido" };
  }
}

export async function updateOrder(
  orderCode: string,
  updates: Partial<{
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    type: string;
    description: string;
    value: number;
    paid: number;
    delivery_date: string;
    status: string;
    observations: string;
    file_url: string;
    personalizations: OrderPersonalizationInput[];
    products?: Array<{ id: string; quantity: number }>; // Lista de produtos do catálogo com suas quantidades
    services?: Array<{ id: string; quantity: number }>; // Lista de serviços rápidos com suas quantidades
  }>
): Promise<{ ok: boolean; data?: OrderRow; error?: string }> {
  try {
    console.log(`Atualizando pedido completo ${orderCode}:`, updates);
    
    if (!orderCode || orderCode.trim() === "") {
      console.error("Identificador do pedido inválido");
      return { ok: false, error: "Pedido inválido" };
    }

    // Verificar se o banco está funcionando
    const isDbWorking = await checkDatabaseHealth();

    if (!isDbWorking) {
      console.log("Banco não está funcionando");
      return { ok: false, error: "Banco não está funcionando" };
    }

    const { column, value } = resolveOrderFilter(orderCode);

    const { personalizations, products, services, ...restUpdates } = updates ?? {};

    const sanitizedUpdates = Object.fromEntries(
      Object.entries(restUpdates ?? {}).filter(([, v]) => v !== undefined)
    ) as typeof restUpdates;

    // Preparar dados para atualização
    const updateData = {
      ...sanitizedUpdates,
      updated_at: new Date().toISOString()
    };

    // Timeout de 5 segundos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 5000)
    );

    const updatePromise = (supabase
      .from("atelie_orders" as any)
      .update(updateData)
      .eq(column, value)
      .select()
      .single() as any);

    const { data, error } = await Promise.race([updatePromise, timeoutPromise]) as any;

    if (error) {
      console.error("Erro ao atualizar pedido:", error);
      return { ok: false, error: (error as any)?.message || "Erro ao atualizar pedido" };
    }

    if (!data) {
      console.error("Pedido não encontrado para atualização", { orderCode, column, value });
      return { ok: false, error: "Pedido não encontrado" };
    }

    const updatedOrder = data as OrderRow;
    const effectiveOrderCode = updatedOrder.code;
    const paidValue = sanitizedUpdates.paid;

    // Se o campo 'paid' foi alterado, atualizar também a tabela de receitas
    if (paidValue !== undefined) {
      console.log("Campo 'paid' foi alterado, atualizando tabela de receitas...");

      // Buscar se já existe receita para este pedido
      const { data: existingReceita } = await (supabase
        .from("atelie_receitas" as any)
        .select("id")
        .eq("order_code", effectiveOrderCode)
        .maybeSingle() as any);

      if (existingReceita) {
        // Atualizar receita existente
        const { error: updateReceitaError } = await (supabase
          .from("atelie_receitas" as any)
          .update({ 
            amount: paidValue,
            updated_at: new Date().toISOString()
          })
          .eq("order_code", effectiveOrderCode) as any);

        if (updateReceitaError) {
          console.error("Erro ao atualizar receita:", updateReceitaError);
          // Não falhar aqui, apenas logar
        } else {
          console.log("Receita atualizada com sucesso");
        }
      } else if (updatedOrder.empresa_id) {
        // Criar nova receita com todos os campos obrigatórios
        const { error: createReceitaError } = await (supabase
          .from("atelie_receitas" as any)
          .insert({
            order_code: effectiveOrderCode,
            customer_name: updatedOrder.customer_name || "Sem nome",
            description: `Pagamento do pedido ${effectiveOrderCode}`,
            amount: paidValue,
            payment_method: "Dinheiro",
            payment_date: new Date().toISOString().split('T')[0],
            status: paidValue > 0 ? "pago" : "pendente",
            empresa_id: updatedOrder.empresa_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as any));

        if (createReceitaError) {
          console.error("Erro ao criar receita:", createReceitaError);
          // Não falhar aqui, apenas logar
        } else {
          console.log("Receita criada com sucesso");
        }
      }
    }

    if (personalizations && updatedOrder.id) {
      console.log("Atualizando personalizações do pedido:", personalizations.length);

      const { error: deletePersonalizationsError } = await (supabase
        .from("atelie_order_personalizations" as any)
        .delete()
        .eq("order_id", updatedOrder.id) as any);

      if (deletePersonalizationsError) {
        console.error("Erro ao remover personalizações do pedido:", deletePersonalizationsError);
      } else if (personalizations.length) {
        const empresa_id = updatedOrder.empresa_id ?? (await getCurrentEmpresaId());
        const sanitizedPersonalizations = personalizations
          .filter((p) => p.person_name?.trim())
          .map((p) => ({
            order_id: updatedOrder.id,
            empresa_id,
            person_name: p.person_name.trim(),
            size: p.size?.trim() || null,
            quantity: p.quantity ?? 1,
            notes: p.notes?.trim() || null,
          }));

        if (sanitizedPersonalizations.length) {
          const { error: insertPersonalizationsError } = await (supabase
            .from("atelie_order_personalizations" as any)
            .insert(sanitizedPersonalizations) as any);

          if (insertPersonalizationsError) {
            console.error("Erro ao salvar personalizações do pedido:", insertPersonalizationsError);
          }
        }
      }
    }

    const { data: orderPersonalizations, error: personalizationsError } = await (supabase
      .from("atelie_order_personalizations" as any)
      .select("id, order_id, empresa_id, person_name, size, quantity, notes, created_at, updated_at")
      .eq("order_id", updatedOrder.id)
      .order("created_at", { ascending: true }) as any);

    if (personalizationsError) {
      console.error("Erro ao carregar personalizações atualizadas:", personalizationsError);
    } else {
      updatedOrder.personalizations = orderPersonalizations ?? [];
    }

    // BAIXA AUTOMÁTICA DE ESTOQUE: Se produtos ou serviços foram adicionados na edição
    const empresa_id = updatedOrder.empresa_id ?? (await getCurrentEmpresaId());
    
    if (products && products.length > 0) {
      console.log("🚀 Iniciando baixa automática de estoque para produtos adicionados na edição", {
        products_count: products.length,
        order_code: effectiveOrderCode,
        empresa_id
      });

      // Mesmo motivo do createOrder: não agendar para "depois", pois navegação/reload
      // pode matar a execução e a movimentação não aparece no estoque.
      try {
        console.log("🔄 Executando baixa automática de estoque para produtos adicionados...");

        let successCount = 0;
        let errorCount = 0;

        for (const product of products) {
          try {
            await baixarEstoqueAutomatico(
              product.id,
              product.quantity,
              effectiveOrderCode,
              updatedOrder.id,
              empresa_id
            );
            successCount++;
            console.log(`✅ Baixa de estoque concluída para produto ${product.id} (quantidade: ${product.quantity})`);
          } catch (error) {
            errorCount++;
            console.error(`❌ Erro na baixa de estoque para produto ${product.id}:`, error);
          }
        }

        console.log(`✅ Baixa automática de estoque concluída: ${successCount} sucesso(s), ${errorCount} erro(s)`);
      } catch (error) {
        console.error("❌ Erro na baixa automática de estoque (não crítico):", error);
        console.error("Stack trace:", (error as Error).stack);
      }
    }

    if (services && services.length > 0) {
      console.log("🚀 Iniciando baixa automática de estoque para serviços adicionados na edição", {
        services_count: services.length,
        order_code: effectiveOrderCode,
        empresa_id
      });

      try {
        console.log("🔄 Executando baixa automática de estoque para serviços adicionados...");

        let successCount = 0;
        let errorCount = 0;

        for (const service of services) {
          try {
            await baixarEstoqueServico(
              service.id,
              service.quantity,
              effectiveOrderCode,
              updatedOrder.id,
              empresa_id
            );
            successCount++;
            console.log(`✅ Baixa de estoque concluída para serviço ${service.id} (quantidade: ${service.quantity})`);
          } catch (error) {
            errorCount++;
            console.error(`❌ Erro na baixa de estoque para serviço ${service.id}:`, error);
          }
        }

        console.log(`✅ Baixa automática de estoque para serviços concluída: ${successCount} sucesso(s), ${errorCount} erro(s)`);
      } catch (error) {
        console.error("❌ Erro na baixa automática de estoque de serviços (não crítico):", error);
        console.error("Stack trace:", (error as Error).stack);
      }
    }

    console.log("Pedido atualizado com sucesso:", updatedOrder);
    return { ok: true, data: updatedOrder };
  } catch (e: unknown) {
    console.error("Erro ao atualizar pedido:", e);
    return { ok: false, error: (e as any)?.message || "Erro ao atualizar pedido" };
  }
}

export function generateOrderCode(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PED-${year}${month}${day}-${random}`;
}