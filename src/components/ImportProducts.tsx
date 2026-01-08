import { useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle2, XCircle, Loader2, AlertCircle, Download, HelpCircle, Info, X } from "lucide-react";
import { toast } from "sonner";
import { createProduct, getProducts, updateProduct } from "@/integrations/supabase/products";
import { createInventoryItem, listInventory, updateInventoryItem } from "@/integrations/supabase/inventory";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { criarMovimentacao } from "@/integrations/supabase/movimentacoes-estoque";

interface ImportedProduct {
  name: string;
  type: string;
  materials: string[];
  work_hours: number;
  unit_price: number;
  profit_margin: number;
  row: number;
  errors: string[];
  isDuplicate?: boolean;
  importError?: string;
  status?: 'pending' | 'success' | 'error' | 'duplicate';
  inventoryItemName?: string;
  inventoryItemId?: string;
  resolvedInventoryItemId?: string; // id | "__create__" | "__skip__"
  quantityPerUnit?: number;
  stockQuantity?: number;
  stockUnit?: string;
  stockItemType?: "materia_prima" | "tecido" | "produto_acabado";
  inventoryMatch?: "matched" | "missing" | "will_create" | "ambiguous" | "not_requested";
  inventoryCandidates?: Array<{ id: string; name: string; unit?: string | null; item_type?: string | null }>;
  warnings?: string[];
}

interface ImportProductsProps {
  onImportComplete?: () => void;
}

const VALID_TYPES = ["Uniforme", "Personalizado", "Bordado", "Estampado"];

type ImportReport = {
  createdStockItems: Array<{ key: string; id: string; name: string; unit: string; item_type: string }>;
  updatedStockItems: Array<{ id: string; name: string; quantity: number; unit?: string }>;
  productsWithoutLink: Array<{ name: string; reason: string }>;
  warnings: Array<{ product: string; warning: string }>;
  createdAt: string;
};

export function ImportProducts({ onImportComplete }: ImportProductsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importedProducts, setImportedProducts] = useState<ImportedProduct[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; errors: number; duplicates: number }>({ success: 0, errors: 0, duplicates: 0 });
  const [showHelp, setShowHelp] = useState(false);
  const [existingProducts, setExistingProducts] = useState<string[]>([]);
  const [isCancelling, setIsCancelling] = useState(false);
  const [autoCreateStockItems, setAutoCreateStockItems] = useState(true);
  const [overwriteStockFromCsv, setOverwriteStockFromCsv] = useState(false);
  const [forceOverwriteConfirm, setForceOverwriteConfirm] = useState(false);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelImportRef = useRef(false);

  const normalizeKey = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, " ")
      .trim();

  const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());

  const looksIntegerUnit = (unit: string | undefined | null) => {
    const u = (unit ?? "").toLowerCase().trim();
    if (!u) return false;
    return (
      u === "un" ||
      u === "unidade" ||
      u === "unidades" ||
      u === "und" ||
      u === "unds" ||
      u === "pc" ||
      u === "pcs" ||
      u === "peca" ||
      u === "peça" ||
      u === "pecas" ||
      u === "peças"
    );
  };

  const previewPlan = useMemo(() => {
    const productsToAnalyze = importedProducts.filter((p) => p.errors.length === 0 && !p.isDuplicate);

    let linkRequested = 0;
    let willLink = 0;
    let willCreateStock = 0;
    let willUpdateStock = 0;
    let missing = 0;
    let ambiguous = 0;
    let needsReview = 0;
    let withStockValue = 0;
    let warningCount = 0;

    const createKeys = new Set<string>();
    const updateIds = new Set<string>();

    for (const p of productsToAnalyze) {
      if (p.warnings?.length) warningCount += p.warnings.length;

      const wantsLink = (!!p.inventoryItemName || !!p.inventoryItemId) && !!p.quantityPerUnit && (p.quantityPerUnit ?? 0) > 0;
      if (!wantsLink) continue;

      if (typeof p.stockQuantity === "number") withStockValue++;
      linkRequested++;

      if (p.inventoryMatch === "ambiguous" && !p.resolvedInventoryItemId) {
        needsReview++;
      }

      if (p.inventoryMatch === "ambiguous") ambiguous++;
      if (p.inventoryMatch === "missing") missing++;
      if (p.inventoryMatch === "matched") willLink++;

      if (p.inventoryMatch === "will_create") {
        willLink++;
        const key = normalizeKey(p.inventoryItemName || p.inventoryItemId || "");
        if (key) createKeys.add(key);
      }

      // Planejar update de estoque (apenas se usuário marcou sobrescrever + confirmou)
      if (
        overwriteStockFromCsv &&
        forceOverwriteConfirm &&
        typeof p.stockQuantity === "number" &&
        p.inventoryMatch === "matched" &&
        p.resolvedInventoryItemId &&
        isUuid(p.resolvedInventoryItemId)
      ) {
        updateIds.add(p.resolvedInventoryItemId);
      }
    }

    willCreateStock = createKeys.size;
    willUpdateStock = updateIds.size;

    return {
      linkRequested,
      willLink,
      willCreateStock,
      willUpdateStock,
      missing,
      ambiguous,
      needsReview,
      withStockValue,
      warningCount,
    };
  }, [importedProducts, overwriteStockFromCsv, forceOverwriteConfirm]);

  const hasBlockingReview = useMemo(() => previewPlan.needsReview > 0, [previewPlan.needsReview]);

  const downloadExampleCSV = () => {
    const csvContent = `Nome,Tipo,Materiais,Horas Trabalho,Preço Unitário,Margem Lucro (%),Item Estoque,ID Estoque,Quantidade por Unidade,Estoque,Unidade Estoque,Tipo Estoque
Camiseta Polo Bordada,Bordado,"linha, tecido",1.5,25.00,35,Tecido Algodão,,2.5,120,metros,tecido
Vestido Personalizado,Personalizado,"tecido, linha, zíper",3.0,120.00,40,Tecido Seda,,3.0,80,metros,tecido
Uniforme Escolar,Uniforme,"tecido, botões, etiqueta",2.0,85.00,30,Tecido Algodão,,2.0,120,metros,tecido
Camiseta Estampada,Estampado,"camiseta, tinta",0.5,35.00,50,Camiseta Básica,,1.0,15,unidades,produto_acabado`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'exemplo_produtos.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Arquivo de exemplo baixado!");
  };

  const parseCSV = (text: string): string[][] => {
    const lines: string[] = [];
    let currentLine = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentLine += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === '\n' && !inQuotes) {
        lines.push(currentLine);
        currentLine = '';
      } else if (char === '\r' && !inQuotes) {
        // Skip carriage return
      } else {
        currentLine += char;
      }
    }
    if (currentLine) lines.push(currentLine);

    return lines.map(line => {
      const values: string[] = [];
      let currentValue = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            currentValue += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim());
      return values;
    });
  };

  // Função para ler arquivo com detecção de encoding
  const readFileWithEncoding = async (file: File): Promise<string> => {
    // Se for Excel, não podemos ler como texto
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      toast.error("Arquivos Excel (.xlsx, .xls) precisam ser convertidos para CSV antes da importação. Por favor, salve como CSV (UTF-8) no Excel.");
      throw new Error("Arquivo Excel não suportado diretamente");
    }

    // Para CSV, tentar diferentes encodings
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Tentar UTF-8 primeiro
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      return decoder.decode(uint8Array);
    } catch (e) {
      // Se UTF-8 falhar, tentar Windows-1252 (comum no Brasil)
      try {
        const decoder = new TextDecoder('windows-1252', { fatal: false });
        return decoder.decode(uint8Array);
      } catch (e2) {
        // Se Windows-1252 falhar, tentar ISO-8859-1
        const decoder = new TextDecoder('iso-8859-1', { fatal: false });
        return decoder.decode(uint8Array);
      }
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validar tipo de arquivo
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const validExtensions = ['.csv', '.xls', '.xlsx'];
    const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(selectedFile.type) && !validExtensions.includes(fileExtension)) {
      toast.error("Por favor, selecione um arquivo CSV ou Excel (.csv, .xls, .xlsx)");
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const text = await readFileWithEncoding(selectedFile);
      const lines = parseCSV(text);
      
      if (lines.length < 2) {
        toast.error("O arquivo deve ter pelo menos um cabeçalho e uma linha de dados");
        setIsProcessing(false);
        return;
      }

      // Primeira linha é o cabeçalho
      const headers = lines[0].map(h => h.toLowerCase().trim());
      
      // Encontrar índices das colunas
      const nameIndex = headers.findIndex(h => h.includes('nome') || h.includes('name'));
      const typeIndex = headers.findIndex(h => h.includes('tipo') || h.includes('type') || h.includes('categoria') || h.includes('category'));
      const materialsIndex = headers.findIndex(h => h.includes('materiais') || h.includes('materials') || h.includes('material'));
      const workHoursIndex = headers.findIndex(h => h.includes('horas') || h.includes('hours') || h.includes('tempo') || h.includes('work'));
      const unitPriceIndex = headers.findIndex(h => h.includes('preço') || h.includes('price') || h.includes('preco') || h.includes('valor') || h.includes('unit'));
      const profitMarginIndex = headers.findIndex(h => h.includes('margem') || h.includes('margin') || h.includes('lucro') || h.includes('profit'));
      const inventoryItemIndex = headers.findIndex(h => h.includes('estoque') || h.includes('inventory') || h.includes('item estoque') || h.includes('item_estoque'));
      const inventoryItemIdIndex = headers.findIndex((h) => h.includes("id estoque") || h.includes("estoque id") || h.includes("inventory id") || h.includes("inventory_item_id"));
      const quantityPerUnitIndex = headers.findIndex(h => h.includes('quantidade por unidade') || h.includes('quantity per unit') || h.includes('qtd por unidade') || h.includes('qtd_por_unidade'));
      const stockQuantityIndex = headers.findIndex((h) => {
        const hasStock = h.includes("estoque") || h.includes("stock");
        const hasQuantity = h.includes("quant") || h.includes("qtd") || h.includes("saldo") || h.includes("atual") || h.includes("inicial");
        const isItemStock = h.includes("item estoque") || h.includes("item_estoque") || h.includes("inventory item");
        return hasStock && hasQuantity && !isItemStock;
      });
      const stockUnitIndex = headers.findIndex((h) => {
        const hasUnit = h.includes("unidade") || h.includes("unit");
        const isUnitPrice = h.includes("preço") || h.includes("preco") || h.includes("price");
        const hasStock = h.includes("estoque") || h.includes("stock");
        // Preferir colunas do tipo "Unidade Estoque"
        return hasUnit && hasStock && !isUnitPrice;
      });
      const stockTypeIndex = headers.findIndex((h) => h.includes("tipo estoque") || h.includes("tipo_estoque") || h.includes("inventory type") || h.includes("item_type"));

      if (nameIndex === -1) {
        toast.error("Não foi encontrada uma coluna 'Nome' no arquivo. Verifique o cabeçalho.");
        setIsProcessing(false);
        return;
      }

      if (typeIndex === -1) {
        toast.error("Não foi encontrada uma coluna 'Tipo' no arquivo. Verifique o cabeçalho.");
        setIsProcessing(false);
        return;
      }

      // Processar linhas de dados
      const products: ImportedProduct[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        if (row.every(cell => !cell.trim())) continue; // Pular linhas vazias

        const name = row[nameIndex]?.trim() || '';
        const type = row[typeIndex]?.trim() || '';
        const materialsStr = materialsIndex >= 0 ? row[materialsIndex]?.trim() : '';
        const workHoursStr = workHoursIndex >= 0 ? row[workHoursIndex]?.trim() : '0';
        const unitPriceStr = unitPriceIndex >= 0 ? row[unitPriceIndex]?.trim() : '0';
        const profitMarginStr = profitMarginIndex >= 0 ? row[profitMarginIndex]?.trim() : '0';
        const inventoryItemName = inventoryItemIndex >= 0 ? row[inventoryItemIndex]?.trim() : '';
        const inventoryItemIdStr = inventoryItemIdIndex >= 0 ? row[inventoryItemIdIndex]?.trim() : '';
        const quantityPerUnitStr = quantityPerUnitIndex >= 0 ? row[quantityPerUnitIndex]?.trim() : '1';
        const stockQuantityStr = stockQuantityIndex >= 0 ? row[stockQuantityIndex]?.trim() : '';
        const stockUnitStr = stockUnitIndex >= 0 ? row[stockUnitIndex]?.trim() : '';
        const stockTypeStr = stockTypeIndex >= 0 ? row[stockTypeIndex]?.trim() : '';

        const errors: string[] = [];

        // Validar nome
        if (!name) {
          errors.push("Nome é obrigatório");
        } else if (name.length < 3) {
          errors.push("Nome deve ter pelo menos 3 caracteres");
        }

        // Validar tipo
        if (!type) {
          errors.push("Tipo é obrigatório");
        } else if (!VALID_TYPES.includes(type)) {
          errors.push(`Tipo inválido. Use: ${VALID_TYPES.join(', ')}`);
        }

        // Processar materiais
        let materials: string[] = [];
        if (materialsStr) {
          materials = materialsStr.split(',').map(m => m.trim()).filter(m => m.length > 0);
        }

        // Validar horas de trabalho
        const work_hours = parseFloat(workHoursStr) || 0;
        if (work_hours < 0) {
          errors.push("Horas de trabalho não pode ser negativo");
        }

        // Validar preço unitário
        const unit_price = parseFloat(unitPriceStr.replace(',', '.')) || 0;
        if (unit_price <= 0) {
          errors.push("Preço unitário deve ser maior que zero");
        }

        // Validar margem de lucro
        const profit_margin = parseFloat(profitMarginStr.replace(',', '.')) || 0;
        if (profit_margin < 0 || profit_margin > 100) {
          errors.push("Margem de lucro deve estar entre 0 e 100");
        }

        // Processar quantidade por unidade (opcional)
        const quantityPerUnit = quantityPerUnitStr ? parseFloat(quantityPerUnitStr.replace(',', '.')) : undefined;
        if (quantityPerUnit !== undefined && quantityPerUnit <= 0) {
          errors.push("Quantidade por unidade deve ser maior que zero");
        }

        const inventoryItemId = inventoryItemIdStr ? inventoryItemIdStr.trim() : "";
        if (inventoryItemId && !isUuid(inventoryItemId)) {
          errors.push("ID Estoque inválido (precisa ser UUID)");
        }

        const parsedStockQuantity = stockQuantityStr ? parseFloat(stockQuantityStr.replace(",", ".")) : undefined;
        if (parsedStockQuantity !== undefined && Number.isNaN(parsedStockQuantity)) {
          errors.push("Estoque inválido (use número)");
        }

        const normalizedStockType = stockTypeStr ? stockTypeStr.toLowerCase().trim() : "";
        const stockItemType =
          normalizedStockType === "materia_prima" || normalizedStockType === "matéria-prima" || normalizedStockType === "materiaprima"
            ? "materia_prima"
            : normalizedStockType === "tecido"
            ? "tecido"
            : normalizedStockType === "produto_acabado" || normalizedStockType === "produto acabado" || normalizedStockType === "produto"
            ? "produto_acabado"
            : undefined;

        products.push({
          name,
          type,
          materials,
          work_hours,
          unit_price,
          profit_margin,
          row: i + 1,
          errors,
          inventoryItemName: inventoryItemName || undefined,
          inventoryItemId: inventoryItemId || undefined,
          resolvedInventoryItemId: inventoryItemId ? inventoryItemId : undefined,
          quantityPerUnit: quantityPerUnit || undefined,
          stockQuantity: typeof parsedStockQuantity === "number" && !Number.isNaN(parsedStockQuantity) ? parsedStockQuantity : undefined,
          stockUnit: stockUnitStr || undefined,
          stockItemType,
          warnings: [],
        });
      }

      if (products.length === 0) {
        toast.error("Nenhum produto válido encontrado no arquivo");
        setIsProcessing(false);
        return;
      }

      // Limite de 1000 produtos por importação
      const MAX_PRODUCTS = 1000;
      const productsToProcess = products.length > MAX_PRODUCTS ? products.slice(0, MAX_PRODUCTS) : products;
      
      if (products.length > MAX_PRODUCTS) {
        toast.warning(`O arquivo contém ${products.length} produtos. O limite é ${MAX_PRODUCTS}. Apenas os primeiros ${MAX_PRODUCTS} serão processados.`);
      }

      // Verificar produtos existentes
      toast.info("Verificando produtos duplicados...");
      const existing = await getProducts();
      const existingNames = existing.map(p => p.name.toLowerCase().trim());
      setExistingProducts(existingNames);

      // Marcar duplicatas
      const productsWithDuplicates = productsToProcess.map(p => ({
        ...p,
        isDuplicate: existingNames.includes(p.name.toLowerCase().trim()),
        status: 'pending' as const
      }));

      const duplicatesCount = productsWithDuplicates.filter(p => p.isDuplicate).length;
      if (duplicatesCount > 0) {
        toast.warning(`${duplicatesCount} produto(s) já existem no sistema e serão ignorados`);
      }

      // Prévia de vínculos de estoque (com detecção de ambíguos)
      try {
        const inventory = await listInventory();
        const inventoryById = new Map<string, { id: string; name: string; unit?: string | null; item_type?: string | null }>();
        const inventoryByKey = new Map<string, Array<{ id: string; name: string; unit?: string | null; item_type?: string | null }>>();

        for (const item of inventory) {
          const entry = { id: item.id, name: item.name, unit: item.unit, item_type: (item as any).item_type ?? null };
          inventoryById.set(item.id, entry);
          const key = normalizeKey(item.name);
          const list = inventoryByKey.get(key) ?? [];
          list.push(entry);
          inventoryByKey.set(key, list);
        }

        const enriched = productsWithDuplicates.map((p) => {
          const wantsLink = (!!p.inventoryItemName || !!p.inventoryItemId) && !!p.quantityPerUnit && (p.quantityPerUnit ?? 0) > 0;
          if (!wantsLink) return { ...p, inventoryMatch: "not_requested" as const };

          const warnings: string[] = [];

          // Prioridade: ID Estoque
          if (p.inventoryItemId && isUuid(p.inventoryItemId)) {
            const found = inventoryById.get(p.inventoryItemId);
            if (found) {
              if (looksIntegerUnit(found.unit) && typeof p.quantityPerUnit === "number" && p.quantityPerUnit % 1 !== 0) {
                warnings.push(`Consumo ${p.quantityPerUnit} parece decimal, mas a unidade do estoque é "${found.unit}".`);
              }
              return {
                ...p,
                inventoryMatch: "matched" as const,
                resolvedInventoryItemId: found.id,
                inventoryCandidates: [found],
                warnings,
              };
            }
            return { ...p, inventoryMatch: autoCreateStockItems ? ("will_create" as const) : ("missing" as const), warnings };
          }

          // Fallback: nome do item de estoque
          const requestedName = (p.inventoryItemName ?? "").trim();
          if (!requestedName) {
            return { ...p, inventoryMatch: "missing" as const };
          }
          const key = normalizeKey(requestedName);
          const candidates = inventoryByKey.get(key) ?? [];

          if (candidates.length === 1) {
            const chosen = candidates[0];
            if (looksIntegerUnit(chosen.unit) && typeof p.quantityPerUnit === "number" && p.quantityPerUnit % 1 !== 0) {
              warnings.push(`Consumo ${p.quantityPerUnit} parece decimal, mas a unidade do estoque é "${chosen.unit}".`);
            }
            return {
              ...p,
              inventoryMatch: "matched" as const,
              resolvedInventoryItemId: chosen.id,
              inventoryCandidates: candidates,
              warnings,
            };
          }

          if (candidates.length > 1) {
            return {
              ...p,
              inventoryMatch: "ambiguous" as const,
              inventoryCandidates: candidates,
              resolvedInventoryItemId: undefined,
              warnings: ["Nome de estoque ambíguo (existem itens duplicados com nome equivalente)."],
            };
          }

          return { ...p, inventoryMatch: autoCreateStockItems ? ("will_create" as const) : ("missing" as const), warnings };
        });
        setImportedProducts(enriched);
      } catch {
        setImportedProducts(productsWithDuplicates);
      }
      setImportReport(null);
      toast.success(`${productsToProcess.length} produto(s) encontrado(s) no arquivo`);
    } catch (error: any) {
      console.error("Erro ao processar arquivo:", error);
      toast.error("Erro ao processar arquivo: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (importedProducts.length === 0) {
      toast.error("Nenhum produto para importar");
      return;
    }

    setIsImporting(true);
    setIsCancelling(false);
    cancelImportRef.current = false;
    setImportProgress(0);
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    const createdStockByKey = new Map<string, { id: string; name: string; unit: string; item_type: string }>();
    const updatedStockById = new Map<string, { id: string; name: string; quantity: number; unit?: string }>();
    const productsWithoutLink: Array<{ name: string; reason: string }> = [];
    const reportWarnings: Array<{ product: string; warning: string }> = [];

    // Filtrar apenas produtos válidos e não duplicados
    const productsToImport = importedProducts.filter(p => 
      p.errors.length === 0 && !p.isDuplicate
    );

    if (productsToImport.length === 0) {
      toast.warning("Nenhum produto válido para importar (todos têm erros ou são duplicados)");
      setIsImporting(false);
      return;
    }

    // Buscar itens de estoque para vinculação automática (mapa por id e por nome normalizado)
    let inventoryItems: Array<{ id: string; name: string; unit?: string | null; item_type?: string | null; quantity?: number | null }> = [];
    const inventoryById = new Map<string, { id: string; name: string; unit?: string | null; item_type?: string | null; quantity?: number | null; min_quantity?: number | null }>();
    const inventoryByKey = new Map<string, Array<{ id: string; name: string; unit?: string | null; item_type?: string | null; quantity?: number | null; min_quantity?: number | null }>>();
    try {
      inventoryItems = await listInventory();
      for (const item of inventoryItems) {
        const entry = { id: item.id, name: item.name, unit: item.unit, item_type: item.item_type, quantity: (item as any).quantity ?? null, min_quantity: (item as any).min_quantity ?? null };
        inventoryById.set(item.id, entry);
        const key = normalizeKey(item.name);
        const list = inventoryByKey.get(key) ?? [];
        list.push(entry);
        inventoryByKey.set(key, list);
      }
    } catch (error) {
      console.warn("Não foi possível buscar itens de estoque para vinculação automática:", error);
    }

    // Importar produtos em lotes para não sobrecarregar
    const batchSize = 10;
    const totalProducts = productsToImport.length;
    
    for (let i = 0; i < productsToImport.length; i += batchSize) {
      if (cancelImportRef.current) {
        toast.info("Importação cancelada pelo usuário");
        break;
      }

      const batch = productsToImport.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (product) => {
          if (cancelImportRef.current) return;

          try {
            const result = await createProduct({
              name: product.name,
              type: product.type,
              materials: product.materials,
              work_hours: product.work_hours,
              unit_price: product.unit_price,
              profit_margin: product.profit_margin
            });

            if (result.ok && result.id) {
              successCount++;
              
              // Vincular estoque automaticamente se especificado
              if ((product.inventoryItemName || product.inventoryItemId) && product.quantityPerUnit && product.quantityPerUnit > 0) {
                try {
                  // Se usuário decidiu "não vincular"
                  if (product.resolvedInventoryItemId === "__skip__") {
                    productsWithoutLink.push({ name: product.name, reason: "Vínculo ignorado pelo usuário" });
                    // Atualizar status do produto
                    setImportedProducts(prev => prev.map(p => 
                      p.row === product.row ? { ...p, status: 'success' } : p
                    ));
                    return;
                  }

                  const requestedName = (product.inventoryItemName ?? "").trim();
                  const requestedId = (product.inventoryItemId ?? "").trim();

                  // Resolver item alvo (id escolhido, id do CSV, nome -> candidato único, criar)
                  let resolvedId: string | null = null;
                  let resolvedItem = null as null | { id: string; name: string; unit?: string | null; item_type?: string | null; quantity?: number | null; min_quantity?: number | null };

                  if (product.resolvedInventoryItemId && product.resolvedInventoryItemId !== "__create__" && product.resolvedInventoryItemId !== "__skip__") {
                    resolvedId = product.resolvedInventoryItemId;
                  } else if (requestedId && isUuid(requestedId)) {
                    resolvedId = requestedId;
                  }

                  if (resolvedId && isUuid(resolvedId)) {
                    const found = inventoryById.get(resolvedId) ?? null;
                    if (found) resolvedItem = found;
                  }

                  // Criar explicitamente (escolha do usuário)
                  const mustCreate = product.resolvedInventoryItemId === "__create__";

                  if (!resolvedItem && !mustCreate) {
                    // Resolver por nome (se houver e não for ambíguo)
                    if (requestedName) {
                      const key = normalizeKey(requestedName);
                      const candidates = inventoryByKey.get(key) ?? [];
                      if (candidates.length === 1) {
                        resolvedItem = candidates[0];
                      } else if (candidates.length > 1) {
                        productsWithoutLink.push({ name: product.name, reason: "Nome de estoque ambíguo (não resolvido)" });
                        // Não falhar importação do produto; apenas não vincular
                        setImportedProducts(prev => prev.map(p => 
                          p.row === product.row ? { ...p, status: 'success' } : p
                        ));
                        return;
                      }
                    }
                  }

                  // Criar automaticamente se não existir (opcional) ou se usuário forçou
                  if ((!resolvedItem && autoCreateStockItems) || mustCreate) {
                    const createKey = normalizeKey(requestedName || requestedId);
                    const cachedCreated = createKey ? createdStockByKey.get(createKey) : undefined;
                    if (cachedCreated) {
                      resolvedItem = { id: cachedCreated.id, name: cachedCreated.name, unit: cachedCreated.unit, item_type: cachedCreated.item_type };
                    } else {
                      const inferredUnit = product.stockUnit?.trim() || "unidades";
                      const inferredType =
                        product.stockItemType ??
                        (inferredUnit.toLowerCase().includes("m") || inferredUnit.toLowerCase().includes("metro") ? "tecido" : "produto_acabado");

                      if (!requestedName) {
                        productsWithoutLink.push({ name: product.name, reason: "Sem nome de estoque para criar" });
                      } else {
                        const createResult = await createInventoryItem({
                          name: requestedName,
                          quantity: product.stockQuantity ?? 0,
                          unit: inferredUnit,
                          min_quantity: 0,
                          item_type: inferredType,
                          category: null,
                          supplier: null,
                          cost_per_unit: null,
                          metadata: {},
                        });

                        if (createResult.ok && createResult.id) {
                          const created = { id: createResult.id, name: requestedName, unit: inferredUnit, item_type: inferredType };
                          if (createKey) createdStockByKey.set(createKey, created);
                          resolvedItem = created;
                        } else {
                          productsWithoutLink.push({ name: product.name, reason: "Falha ao criar item de estoque" });
                        }
                      }
                    }
                  }

                  // Sobrescrever saldo existente (opcional) usando a coluna Estoque
                  if (
                    resolvedItem &&
                    !createdStockByKey.has(normalizeKey(resolvedItem.name)) &&
                    overwriteStockFromCsv &&
                    forceOverwriteConfirm &&
                    typeof product.stockQuantity === "number"
                  ) {
                    const updatedUnit = product.stockUnit?.trim() || resolvedItem.unit || undefined;

                    // Ajuste via movimentação (auditoria) para chegar no valor absoluto do CSV
                    const currentQty = typeof resolvedItem.quantity === "number" ? Number(resolvedItem.quantity) : 0;
                    const targetQty = Number(product.stockQuantity);
                    const delta = targetQty - currentQty;
                    if (delta !== 0) {
                      await criarMovimentacao({
                        inventory_item_id: resolvedItem.id,
                        tipo_movimentacao: "ajuste",
                        ajuste_sign: delta >= 0 ? "incremento" : "decremento",
                        quantidade: Math.abs(delta),
                        motivo: `Ajuste via importação de produtos (CSV)`,
                        origem: "importacao_produtos",
                        origem_id: null,
                      } as any);
                    }

                    // Atualizar unidade (se enviada no CSV)
                    if (updatedUnit) {
                      await updateInventoryItem(resolvedItem.id, { unit: updatedUnit });
                    }

                    updatedStockById.set(resolvedItem.id, { id: resolvedItem.id, name: resolvedItem.name, quantity: targetQty, unit: updatedUnit });
                  }

                  if (resolvedItem) {
                    if (looksIntegerUnit(resolvedItem.unit) && typeof product.quantityPerUnit === "number" && product.quantityPerUnit % 1 !== 0) {
                      reportWarnings.push({ product: product.name, warning: `Consumo ${product.quantityPerUnit} parece decimal, mas a unidade do estoque é "${resolvedItem.unit}".` });
                    }
                    await updateProduct(result.id, {
                      inventory_items: [resolvedItem.id],
                      inventory_quantities: [product.quantityPerUnit],
                    });
                  } else {
                    console.warn(`⚠️ Item de estoque "${product.inventoryItemName}" não encontrado para o produto "${product.name}". Produto criado sem vínculo.`);
                    productsWithoutLink.push({ name: product.name, reason: "Item de estoque não encontrado" });
                  }
                } catch (inventoryError) {
                  console.warn(`⚠️ Erro ao vincular estoque para produto "${product.name}":`, inventoryError);
                  // Não falhar a importação se a vinculação falhar
                  productsWithoutLink.push({ name: product.name, reason: "Erro ao vincular estoque" });
                }
              }

              // Atualizar status do produto
              setImportedProducts(prev => prev.map(p => 
                p.row === product.row ? { ...p, status: 'success' } : p
              ));
            } else {
              errorCount++;
              const errorMsg = result.error || "Erro desconhecido";
              // Atualizar status do produto
              setImportedProducts(prev => prev.map(p => 
                p.row === product.row ? { ...p, status: 'error', importError: errorMsg } : p
              ));
              console.error(`Erro ao importar produto linha ${product.row}:`, errorMsg);
            }
          } catch (error: any) {
            errorCount++;
            const errorMsg = error?.message || "Erro desconhecido";
            setImportedProducts(prev => prev.map(p => 
              p.row === product.row ? { ...p, status: 'error', importError: errorMsg } : p
            ));
            console.error(`Erro ao importar produto linha ${product.row}:`, error);
          }
        })
      );

      // Atualizar progresso
      const progress = Math.min(i + batchSize, totalProducts);
      const progressPercent = Math.round((progress / totalProducts) * 100);
      setImportProgress(progressPercent);

      // Pequeno delay entre lotes
      if (i + batchSize < productsToImport.length && !cancelImportRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Contar duplicatas
    duplicateCount = importedProducts.filter(p => p.isDuplicate).length;

    setImportResults({ success: successCount, errors: errorCount, duplicates: duplicateCount });
    
    if (successCount > 0) {
      toast.success(`${successCount} produto(s) importado(s) com sucesso!`);
    }
    
    if (errorCount > 0) {
      toast.error(`${errorCount} produto(s) não puderam ser importados`);
    }

    if (duplicateCount > 0) {
      toast.info(`${duplicateCount} produto(s) duplicado(s) foram ignorados`);
    }

    setIsImporting(false);

    // Montar relatório pós-importação (baixável)
    const createdStockItems = Array.from(createdStockByKey.entries()).map(([key, value]) => ({ key, ...value }));
    const updatedStockItems = Array.from(updatedStockById.values());
    const warningsFromPreview: Array<{ product: string; warning: string }> = [];
    for (const p of importedProducts) {
      if (p.warnings?.length) {
        p.warnings.forEach((w) => warningsFromPreview.push({ product: p.name, warning: w }));
      }
    }
    setImportReport({
      createdStockItems,
      updatedStockItems,
      productsWithoutLink,
      warnings: [...warningsFromPreview, ...reportWarnings],
      createdAt: new Date().toISOString(),
    });

    if (onImportComplete && !cancelImportRef.current) {
      onImportComplete();
    }
  };

  const handleCancelImport = () => {
    cancelImportRef.current = true;
    setIsCancelling(true);
    setIsImporting(false);
    toast.info("Cancelando importação...");
  };

  const exportErrors = () => {
    const errors = importedProducts.filter(p => 
      p.errors.length > 0 || p.status === 'error' || p.isDuplicate
    );

    if (errors.length === 0) {
      toast.info("Nenhum erro para exportar");
      return;
    }

    const csvContent = [
      ['Linha', 'Nome', 'Tipo', 'Erro'].join(','),
      ...errors.map(p => [
        p.row,
        `"${p.name}"`,
        `"${p.type}"`,
        `"${p.isDuplicate ? 'Produto já existe' : p.errors.join('; ') || p.importError || 'Erro desconhecido'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `erros_importacao_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Arquivo de erros exportado!");
  };

  const downloadImportReport = () => {
    if (!importReport) {
      toast.info("Nenhum relatório disponível");
      return;
    }

    const rows: string[] = [];
    rows.push(["Tipo", "Produto", "Item Estoque", "ID Estoque", "Quantidade", "Unidade", "Detalhe"].join(","));

    importReport.createdStockItems.forEach((it) => {
      rows.push(["estoque_criado", "", it.name, it.id, "", it.unit, it.item_type].map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","));
    });
    importReport.updatedStockItems.forEach((it) => {
      rows.push(["estoque_atualizado", "", it.name, it.id, String(it.quantity), it.unit ?? "", ""].map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","));
    });
    importReport.productsWithoutLink.forEach((p) => {
      rows.push(["produto_sem_vinculo", p.name, "", "", "", "", p.reason].map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","));
    });
    importReport.warnings.forEach((w) => {
      rows.push(["aviso", w.product, "", "", "", "", w.warning].map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","));
    });

    const blob = new Blob(["\ufeff" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_importacao_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Relatório baixado!");
  };

  const handleClose = () => {
    if (isImporting) {
      if (!confirm("A importação está em andamento. Deseja realmente cancelar?")) {
        return;
      }
      handleCancelImport();
    }
    setFile(null);
    setImportedProducts([]);
    setImportResults({ success: 0, errors: 0, duplicates: 0 });
    setImportProgress(0);
    setExistingProducts([]);
    setImportReport(null);
    setIsOpen(false);
    cancelImportRef.current = false;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validProducts = importedProducts.filter(p => p.errors.length === 0 && !p.isDuplicate);
  const invalidProducts = importedProducts.filter(p => p.errors.length > 0);
  const duplicateProducts = importedProducts.filter(p => p.isDuplicate);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar Produtos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Produtos
          </DialogTitle>
          <DialogDescription>
            Importe uma lista de produtos de um arquivo CSV. Colunas obrigatórias: Nome, Tipo. Colunas opcionais: Item Estoque, ID Estoque, Quantidade por Unidade, Estoque, Unidade Estoque, Tipo Estoque. <strong>Limite: até 1000 produtos por importação.</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Seção de Ajuda e Exemplo */}
          <div className="border rounded-lg p-4 bg-blue-50/50">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Como preparar seu arquivo</h3>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowHelp(!showHelp)}
                className="h-auto p-1"
              >
                {showHelp ? "Ocultar" : "Mostrar"}
              </Button>
            </div>
            
            {showHelp && (
              <div className="space-y-4 mt-3">
                {/* Instruções */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-blue-900">📋 Instruções:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                    <li>A primeira linha deve conter os cabeçalhos das colunas</li>
                    <li>As colunas <strong>"Nome"</strong> e <strong>"Tipo"</strong> são obrigatórias</li>
                    <li>Tipos válidos: Uniforme, Personalizado, Bordado, Estampado</li>
                    <li>Materiais: separar por vírgula (ex: "linha, tecido, botões")</li>
                    <li>Horas de trabalho, Preço e Margem: use números decimais (ponto ou vírgula)</li>
                    <li>Margem de lucro deve estar entre 0 e 100</li>
                    <li><strong>Item Estoque</strong> (opcional): Nome do item de estoque para vincular automaticamente</li>
                    <li><strong>Quantidade por Unidade</strong> (opcional): Quantidade do item de estoque consumida por unidade do produto</li>
                  </ol>
                </div>

                {/* Exemplo Visual */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-blue-900">📄 Exemplo de formato CSV:</h4>
                  <div className="bg-white border border-blue-200 rounded p-3 font-mono text-xs overflow-x-auto">
                    <div className="text-blue-900 font-semibold mb-1">Cabeçalho (primeira linha):</div>
                    <div className="text-gray-700 mb-3">Nome,Tipo,Materiais,Horas Trabalho,Preço Unitário,Margem Lucro (%),Item Estoque,Quantidade por Unidade</div>
                    
                    <div className="text-blue-900 font-semibold mb-1">Dados (linhas seguintes):</div>
                    <div className="text-gray-700 space-y-1">
                      <div>Camiseta Polo Bordada,Bordado,"linha, tecido",1.5,25.00,35,Tecido Algodão,2.5</div>
                      <div>Vestido Personalizado,Personalizado,"tecido, linha, zíper",3.0,120.00,40,Tecido Seda,3.0</div>
                      <div>Uniforme Escolar,Uniforme,"tecido, botões",2.0,85.00,30,Tecido Algodão,2.0</div>
                    </div>
                  </div>
                </div>

                {/* Tabela de Exemplo */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-blue-900">📊 Visualização em tabela:</h4>
                  <div className="bg-white border border-blue-200 rounded overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-blue-100">
                        <tr>
                          <th className="p-2 text-left border-r border-blue-200">Nome</th>
                          <th className="p-2 text-left border-r border-blue-200">Tipo</th>
                          <th className="p-2 text-left border-r border-blue-200">Materiais</th>
                          <th className="p-2 text-left border-r border-blue-200">Horas</th>
                          <th className="p-2 text-left border-r border-blue-200">Preço</th>
                          <th className="p-2 text-left border-r border-blue-200">Margem %</th>
                          <th className="p-2 text-left border-r border-blue-200">Estoque</th>
                          <th className="p-2 text-left">Qtd/Un</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-2 border-r border-blue-200">Camiseta Polo</td>
                          <td className="p-2 border-r border-blue-200">Bordado</td>
                          <td className="p-2 border-r border-blue-200">linha, tecido</td>
                          <td className="p-2 border-r border-blue-200">1.5</td>
                          <td className="p-2 border-r border-blue-200">25.00</td>
                          <td className="p-2 border-r border-blue-200">35</td>
                          <td className="p-2 border-r border-blue-200">Tecido Algodão</td>
                          <td className="p-2">2.5</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Dicas Importantes */}
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <Info className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 text-sm text-yellow-800">
                    <p className="font-medium mb-1">💡 Dicas importantes:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Salve o arquivo como <strong>CSV (UTF-8)</strong> para evitar problemas de acentuação</li>
                      <li>Não deixe linhas vazias entre os dados</li>
                      <li>Use vírgulas para separar materiais dentro de aspas: "linha, tecido"</li>
                      <li>Valores decimais podem usar ponto ou vírgula: 25.50 ou 25,50</li>
                      <li>Margem de lucro é em porcentagem (0-100)</li>
                      <li><strong>Item Estoque</strong>: Deve corresponder exatamente ao nome de um item cadastrado no estoque</li>
                      <li><strong>Quantidade por Unidade</strong>: Use números decimais (ex: 2.5 significa que cada produto consome 2.5 unidades do item de estoque)</li>
                    </ul>
                  </div>
                </div>

                {/* Botão para baixar exemplo */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadExampleCSV}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Arquivo de Exemplo (CSV)
                </Button>
              </div>
            )}
          </div>

          {/* Seleção de arquivo */}
          <div className="space-y-2">
            <Label htmlFor="file">Arquivo (CSV ou Excel)</Label>
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                id="file"
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing || isImporting}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    {file ? file.name : "Selecionar Arquivo"}
                  </>
                )}
              </Button>
              {file && !isProcessing && (
                <span className="text-sm text-muted-foreground">
                  {file.size > 1024 * 1024 
                    ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                    : `${(file.size / 1024).toFixed(2)} KB`}
                </span>
              )}
            </div>
          </div>

          {/* Opções de estoque/vínculo */}
          <div className="grid gap-3 rounded-lg border p-4 bg-muted/20">
            <div className="flex items-start gap-3">
              <Checkbox
                checked={autoCreateStockItems}
                onCheckedChange={(v) => setAutoCreateStockItems(Boolean(v))}
                id="autoCreateStockItems"
                disabled={isImporting || isProcessing}
              />
              <div className="space-y-1">
                <Label htmlFor="autoCreateStockItems">Criar item no estoque automaticamente quando não existir</Label>
                <p className="text-xs text-muted-foreground">
                  Recomendado para quem tem muitos produtos. O item é criado usando o nome em “Item Estoque”. Se a coluna “Estoque” existir, ela define o saldo inicial.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                checked={overwriteStockFromCsv}
                onCheckedChange={(v) => {
                  const next = Boolean(v);
                  setOverwriteStockFromCsv(next);
                  if (!next) setForceOverwriteConfirm(false);
                }}
                id="overwriteStockFromCsv"
                disabled={isImporting || isProcessing}
              />
              <div className="space-y-1">
                <Label htmlFor="overwriteStockFromCsv">Sobrescrever estoque existente usando a coluna “Estoque”</Label>
                <p className="text-xs text-muted-foreground">
                  Use apenas se o CSV tiver o saldo real atual. Isso SUBSTITUI o estoque atual do item.
                </p>
                {overwriteStockFromCsv && (
                  <div className="mt-2 flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3">
                    <Checkbox
                      checked={forceOverwriteConfirm}
                      onCheckedChange={(v) => setForceOverwriteConfirm(Boolean(v))}
                      id="forceOverwriteConfirm"
                      disabled={isImporting || isProcessing}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="forceOverwriteConfirm">Eu entendo que isso substitui o estoque atual</Label>
                      <p className="text-xs text-amber-700">
                        Segurança: o sistema só sobrescreve se essa confirmação estiver marcada.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {importedProducts.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Prévia (vínculo/estoque): {previewPlan.linkRequested} pedem vínculo • {previewPlan.willLink} serão vinculados •{" "}
                {previewPlan.willCreateStock} item(ns) de estoque serão criados • {previewPlan.willUpdateStock} item(ns) terão estoque atualizado •{" "}
                {previewPlan.ambiguous} ambíguo(s) • {previewPlan.missing} ausente(s) • {previewPlan.withStockValue} com saldo no CSV •{" "}
                {previewPlan.warningCount} aviso(s)
              </div>
            )}
            {hasBlockingReview && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                Existem itens de estoque <strong>ambíguos</strong> (duplicados) e precisam ser escolhidos na tabela antes de importar (ou marque “Não vincular” nesses produtos).
              </div>
            )}
          </div>

          {/* Preview dos produtos */}
          {importedProducts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-sm font-medium">
                    {validProducts.length} produto(s) válido(s) • {invalidProducts.length} com erro(s) • {duplicateProducts.length} duplicado(s)
                  </p>
                </div>
                <div className="flex gap-2">
                  {(invalidProducts.length > 0 || duplicateProducts.length > 0) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={exportErrors}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Exportar Erros
                    </Button>
                  )}
                  {importResults.success > 0 && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      {importResults.success} importado(s) • {importResults.errors} erro(s) • {importResults.duplicates} duplicado(s)
                    </div>
                  )}
                </div>
              </div>

              {/* Barra de progresso */}
              {isImporting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Importando produtos...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <Progress value={importProgress} className="h-2" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCancelImport}
                    disabled={isCancelling}
                    className="w-full"
                  >
                    {isCancelling ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Cancelando...
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Cancelar Importação
                      </>
                    )}
                  </Button>
                </div>
              )}

              <div className="border rounded-lg max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Linha</th>
                      <th className="p-2 text-left">Nome</th>
                      <th className="p-2 text-left">Tipo</th>
                      <th className="p-2 text-left">Preço</th>
                      <th className="p-2 text-left">Horas</th>
                      <th className="p-2 text-left">Vínculo/Estoque</th>
                      <th className="p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importedProducts.map((product, index) => {
                      const isError = product.errors.length > 0 || product.status === 'error';
                      const isDuplicate = product.isDuplicate;
                      const isSuccess = product.status === 'success';
                      const bgColor = isError ? "bg-red-50" : isDuplicate ? "bg-yellow-50" : isSuccess ? "bg-green-50" : "";

                      return (
                        <tr key={index} className={bgColor}>
                          <td className="p-2">{product.row}</td>
                          <td className="p-2">{product.name || "-"}</td>
                          <td className="p-2">{product.type || "-"}</td>
                          <td className="p-2">R$ {product.unit_price.toFixed(2)}</td>
                          <td className="p-2">{product.work_hours}h</td>
                          <td className="p-2">
                            {(product.inventoryItemName || product.inventoryItemId) && product.quantityPerUnit ? (
                              <div className="text-xs">
                                <div>
                                  <span className="font-medium">Item:</span>{" "}
                                  {product.inventoryItemName ? product.inventoryItemName : <span className="text-muted-foreground">—</span>}{" "}
                                  {product.inventoryItemId ? (
                                    <span className="text-muted-foreground">• ID: {product.inventoryItemId}</span>
                                  ) : null}{" "}
                                  •{" "}
                                  <span className="font-medium">Qtd/Un:</span> {product.quantityPerUnit}
                                </div>
                                {typeof product.stockQuantity === "number" && (
                                  <div className="text-muted-foreground">
                                    <span className="font-medium">Estoque (CSV):</span> {product.stockQuantity}
                                    {product.stockUnit ? ` ${product.stockUnit}` : ""}
                                  </div>
                                )}
                                <div className="mt-1">
                                  {product.inventoryMatch === "matched" ? (
                                    <span className="text-green-700">Vínculo OK (item encontrado)</span>
                                  ) : product.inventoryMatch === "will_create" ? (
                                    <span className="text-blue-700">Item não encontrado (será criado)</span>
                                  ) : product.inventoryMatch === "ambiguous" ? (
                                    <div className="space-y-2">
                                      <div className="text-amber-700">Ambíguo: existem itens duplicados no estoque</div>
                                      <Select
                                        value={product.resolvedInventoryItemId ?? ""}
                                        onValueChange={(value) => {
                                          setImportedProducts((prev) =>
                                            prev.map((p) => {
                                              if (p.row !== product.row) return p;
                                              if (value === "__skip__") {
                                                return { ...p, resolvedInventoryItemId: "__skip__", inventoryMatch: "not_requested" };
                                              }
                                              if (value === "__create__") {
                                                return { ...p, resolvedInventoryItemId: "__create__", inventoryMatch: "will_create" };
                                              }
                                              return { ...p, resolvedInventoryItemId: value, inventoryMatch: "matched" };
                                            })
                                          );
                                        }}
                                      >
                                        <SelectTrigger className="h-8 text-xs">
                                          <SelectValue placeholder="Escolha o item correto" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {(product.inventoryCandidates ?? []).map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                              {c.name} ({c.unit})
                                            </SelectItem>
                                          ))}
                                          <SelectItem value="__create__">Criar novo item no estoque</SelectItem>
                                          <SelectItem value="__skip__">Não vincular este produto</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  ) : product.inventoryMatch === "missing" ? (
                                    <span className="text-amber-700">
                                      Item não encontrado {autoCreateStockItems ? "(será criado)" : "(não será vinculado)"}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">Sem vínculo</span>
                                  )}
                                </div>
                                {product.warnings?.length ? (
                                  <div className="mt-1 text-amber-700">
                                    {product.warnings[0]}
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-2">
                            {isError ? (
                              <div className="flex items-center gap-1 text-red-600">
                                <XCircle className="h-4 w-4" />
                                <span className="text-xs">{product.errors[0] || product.importError || "Erro"}</span>
                              </div>
                            ) : isDuplicate ? (
                              <div className="flex items-center gap-1 text-yellow-600">
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-xs">Duplicado</span>
                              </div>
                            ) : isSuccess ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-xs">Importado</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-blue-600">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-xs">Válido</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {invalidProducts.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-900">
                      {invalidProducts.length} produto(s) com erro(s) não serão importados
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Corrija os erros no arquivo e importe novamente para incluir todos os produtos.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isImporting}>
            {importResults.success > 0 ? "Fechar" : "Cancelar"}
          </Button>
          {importReport && !isImporting && (
            <Button type="button" variant="outline" onClick={downloadImportReport}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Relatório
            </Button>
          )}
          <Button
            type="button"
            onClick={handleImport}
            disabled={validProducts.length === 0 || isImporting || importResults.success > 0 || hasBlockingReview}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Importar {validProducts.length} Produto(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

