import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Calendar, CheckCircle2, Clock, Package, Upload, User, Play, Pause, CheckCircle, Truck, Printer, Edit, CreditCard, Users, FileText, Download, Loader2, RefreshCw, Eye } from "lucide-react";
import { DialogEmitirNota } from "@/components/DialogEmitirNota";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getOrderByCode, updateOrderStatus, type OrderRow } from "@/integrations/supabase/orders";
import { getReceitaByOrderCode } from "@/integrations/supabase/receitas";
import { useSync } from "@/contexts/SyncContext";
import { getMedidas } from "@/integrations/supabase/medidas";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";
import { DEFAULT_ORDER_STATUS_DETAILS, ORDER_STATUS } from "@/utils/statusConstants";
import { getCurrentEmpresaId } from "@/integrations/supabase/auth-utils";
import { useOrderStatusConfig, type OrderStatusDetail } from "@/hooks/useOrderStatusConfig";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type FocusNFServiceType = typeof import("@/integrations/focusnf/service")["focusNFService"];

type OrderItem = {
  id: string;
  client: string;
  type: string;
  description: string;
  value: number;
  paid: number;
  delivery: string; // ISO
  status: "Aguardando aprovação" | "Em produção" | "Finalizando" | "Pronto" | "Aguardando retirada" | "Entregue" | "Cancelado";
  file?: string;
  personalizations?: OrderRow["personalizations"];
};


function getStatusStepIndex(status: OrderItem["status"]) {
  const steps: OrderItem["status"][] = [
    "Aguardando aprovação",
    "Em produção",
    "Finalizando",
    "Pronto",
    "Aguardando retirada",
    "Entregue",
  ];
  return steps.indexOf(status);
}

export default function PedidoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { invalidateRelated } = useSync();
  const { empresa } = useAuth();
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isPaidDialogOpen, setIsPaidDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [newPaidValue, setNewPaidValue] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [forceUpdate, setForceUpdate] = useState(0); // Para forçar re-render
  const [localStatus, setLocalStatus] = useState<string | null>(null); // Estado local do status
  const [notasFiscais, setNotasFiscais] = useState<any[]>([]);
  const [emitindoNota, setEmitindoNota] = useState(false);
  const [consultandoNota, setConsultandoNota] = useState<string | null>(null);
  const [dialogEmitirNotaOpen, setDialogEmitirNotaOpen] = useState(false);
  const [clienteInicial, setClienteInicial] = useState<any>(null);
  const [isCustomizeDialogOpen, setIsCustomizeDialogOpen] = useState(false);
  const [statusDraft, setStatusDraft] = useState<OrderStatusDetail[]>([]);

  const {
    statusDetails,
    statusOptions,
    saveStatusConfigs,
    resetStatusConfigs,
    isSaving: isSavingStatusConfigs,
    isResetting: isResettingStatusConfigs,
  } = useOrderStatusConfig();

  const statusDetailsMap = useMemo(
    () => new Map(statusDetails.map((detail) => [detail.key, detail])),
    [statusDetails]
  );

  const handleOpenCustomizeStatuses = useCallback(() => {
    setStatusDraft(statusDetails.map((detail) => ({ ...detail })));
    setIsCustomizeDialogOpen(true);
  }, [statusDetails]);

  const handleStatusDraftChange = useCallback(
    (key: OrderStatusDetail["key"], field: "label" | "description", value: string) => {
      setStatusDraft((previous) =>
        previous.map((detail) => {
          if (detail.key !== key) {
            return detail;
          }

          if (field === "label") {
            return { ...detail, label: value };
          }

          return { ...detail, description: value };
        })
      );
    },
    []
  );

  const handleStatusDraftRestore = useCallback((key: OrderStatusDetail["key"]) => {
    setStatusDraft((previous) =>
      previous.map((detail) =>
        detail.key === key
          ? {
              ...detail,
              label: detail.defaultLabel,
              description: detail.defaultDescription,
            }
          : detail
      )
    );
  }, []);

  const handleSaveStatusDraft = useCallback(async () => {
    const hasEmpty = statusDraft.some((detail) => detail.label.trim().length === 0);

    if (hasEmpty) {
      toast.error("O nome das etapas não pode ficar vazio.");
      return;
    }

    try {
      const payload = statusDraft.map((detail) => {
        const description = (detail.description ?? "").trim();
        return {
          status_key: detail.key,
          label: detail.label.trim(),
          description: description.length > 0 ? description : null,
        };
      });

      const result = await saveStatusConfigs(payload);

      if (!result.ok) {
        toast.error(result.error || "Erro ao salvar etapas personalizadas.");
        return;
      }

      toast.success("Etapas atualizadas com sucesso!");
      setIsCustomizeDialogOpen(false);
    } catch (error) {
      console.error("Erro ao salvar etapas personalizadas:", error);
      toast.error("Erro ao salvar etapas personalizadas.");
    }
  }, [saveStatusConfigs, statusDraft]);

  const handleResetStatuses = useCallback(async () => {
    try {
      const result = await resetStatusConfigs();

      if (!result.ok) {
        toast.error(result.error || "Erro ao restaurar etapas padrão.");
        return;
      }

      const defaultDraft: OrderStatusDetail[] = DEFAULT_ORDER_STATUS_DETAILS.map((detail) => ({
        key: detail.key as OrderStatusDetail["key"],
        label: detail.label,
        description: detail.description,
        defaultLabel: detail.label,
        defaultDescription: detail.description,
      }));

      setStatusDraft(defaultDraft);
      toast.success("Etapas restauradas para o padrão!");
    } catch (error) {
      console.error("Erro ao restaurar etapas padrão:", error);
      toast.error("Erro ao restaurar etapas padrão.");
    }
  }, [resetStatusConfigs]);

  const code = id as string;
  const focusNFServiceRef = useRef<FocusNFServiceType | null>(null);

  const getFocusNFService = useCallback(async () => {
    if (!focusNFServiceRef.current) {
      const module = await import("@/integrations/focusnf/service");
      focusNFServiceRef.current = module.focusNFService;
    }
    return focusNFServiceRef.current;
  }, []);

  // Carregar notas fiscais do pedido
  const loadNotasFiscais = useCallback(async () => {
    try {
      if (!empresa?.tem_nota_fiscal) {
        setNotasFiscais([]);
        return;
      }

      const focusNF = await getFocusNFService();
      if (!focusNF) {
        setNotasFiscais([]);
        return;
      }

      const notas = await focusNF.listarNotas(code);
      setNotasFiscais(notas);
    } catch (error) {
      console.error('[PedidoDetalhe] Erro ao carregar notas fiscais:', error);
      setNotasFiscais([]);
    }
  }, [code, empresa?.tem_nota_fiscal, getFocusNFService]);

  const handleConsultarNota = useCallback(async (ref: string, showLoading = true) => {
    try {
      if (showLoading) {
        setConsultandoNota(ref);
      }

      const empresa_id = await getCurrentEmpresaId();
      if (!empresa_id) {
        toast.error('Empresa não encontrada');
        return;
      }

      const focusNF = await getFocusNFService();
      if (!focusNF) {
        toast.error('Serviço de notas fiscais indisponível');
        return;
      }

      const result = await focusNF.consultarNota(ref);
      
      if (result.ok && result.data) {
        // Atualizar nota no banco de dados
        const { supabase } = await import('@/integrations/supabase/client');
        const notaData = result.data;

        // Buscar a nota atual no banco
        const { data: notaExistente } = await supabase
          .from('focusnf_notas')
          .select('id')
          .eq('ref', ref)
          .eq('empresa_id', empresa_id)
          .single();

        if (notaExistente) {
          // Atualizar status e dados da nota
          await supabase
            .from('focusnf_notas')
            .update({
              status: notaData.status || 'processando_autorizacao',
              numero: notaData.numero,
              serie: notaData.serie,
              chave_acesso: notaData.chave_nfe || notaData.chave_acesso,
              xml_url: notaData.caminho_xml_nota_fiscal,
              danfe_url: notaData.caminho_danfe,
              dados_retornados: notaData,
              // Só salvar como erro se realmente for um erro (não autorizado)
              erro_mensagem: notaData.status === 'autorizado' || notaData.status === 'processando_autorizacao'
                ? null // Limpar erro se autorizado
                : (notaData.erro_mensagem || notaData.mensagem_sefaz || null),
              updated_at: new Date().toISOString(),
            })
            .eq('id', notaExistente.id);
        }

        // Recarregar lista de notas diretamente
        const notasAtualizadas = await focusNF.listarNotas(code);
        setNotasFiscais(notasAtualizadas);

        if (showLoading) {
          if (notaData.status === 'autorizado') {
            toast.success('Nota fiscal autorizada!');
          } else if (notaData.status === 'erro_autorizacao' || notaData.status === 'denegado') {
            toast.warning(`Status da nota: ${notaData.status}`);
          } else {
            toast.info('Status ainda em processamento');
          }
        }
      } else {
        if (showLoading) {
          toast.error(result.error || 'Erro ao consultar nota');
        }
      }
    } catch (error: any) {
      console.error('Erro ao consultar nota:', error);
      if (showLoading) {
        toast.error(error.message || 'Erro ao consultar nota');
      }
    } finally {
      if (showLoading) {
        setConsultandoNota(null);
      }
    }
  }, [code, getFocusNFService]);

  // Carregar notas fiscais quando o código mudar
  useEffect(() => {
    if (code) {
      loadNotasFiscais();
    }
  }, [code, loadNotasFiscais]);

  // Polling automático para notas em processamento
  useEffect(() => {
    const notasProcessando = notasFiscais.filter(
      nota => nota.status === 'processando_autorizacao'
    );

    if (notasProcessando.length === 0) {
      return; // Não há notas para consultar
    }

    // Consultar a cada 10 segundos
    const interval = setInterval(() => {
      notasProcessando.forEach((nota) => {
        handleConsultarNota(nota.ref, false); // false = não mostrar loading
      });
    }, 10000); // 10 segundos

    return () => clearInterval(interval);
  }, [notasFiscais, handleConsultarNota]);

  const handleEmitirNota = async () => {
    if (!order) {
      toast.error('Pedido não encontrado');
      return;
    }

    if (!empresa?.tem_nota_fiscal) {
      toast.info('Funcionalidade disponível no plano Profissional (com NF). Atualize seu plano para emitir notas fiscais.');
      navigate('/assinatura');
      return;
    }

    // Buscar dados do cliente para preencher o dialog
    let clienteData: any = {
      nome: order.client,
      email: orderDb?.customer_email || undefined,
      telefone: orderDb?.customer_phone || undefined,
    };

    // Tentar buscar cliente completo na tabela atelie_customers
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { getCurrentEmpresaId } = await import('@/integrations/supabase/auth-utils');
      const empresa_id = await getCurrentEmpresaId();
      
      if (empresa_id && order.client) {
        const { data: cliente } = await supabase
          .from('atelie_customers')
          .select('*')
          .eq('empresa_id', empresa_id)
          .ilike('name', order.client)
          .limit(1)
          .single();

        if (cliente) {
          clienteData = {
            nome: cliente.name || clienteData.nome,
            email: cliente.email || clienteData.email,
            telefone: cliente.phone || clienteData.telefone,
            cpf_cnpj: cliente.cpf_cnpj || undefined,
            endereco: {
              logradouro: cliente.endereco_logradouro || undefined,
              numero: cliente.endereco_numero || undefined,
              complemento: cliente.endereco_complemento || undefined,
              bairro: cliente.endereco_bairro || undefined,
              cidade: cliente.endereco_cidade || undefined,
              uf: cliente.endereco_uf || undefined,
              cep: cliente.endereco_cep || undefined,
            }
          };
        }
      }
    } catch (error) {
      console.log('Não foi possível buscar dados completos do cliente:', error);
      // Continuar com dados básicos do pedido
    }

    // Armazenar dados do cliente e abrir dialog
    setClienteInicial(clienteData);
    setDialogEmitirNotaOpen(true);
  };

  const handleConfirmarEmitirNota = async (items: any[], tipoNota: 'NFe' | 'NFCe' | 'NFSe', clienteData: any) => {
    if (!order) {
      toast.error('Pedido não encontrado');
      return;
    }

    try {
      setEmitindoNota(true);
      const valorTotal = items.reduce((acc, item) => acc + item.valor_total, 0);

      const focusNF = await getFocusNFService();
      if (!focusNF) {
        toast.error('Serviço de notas fiscais indisponível');
        setEmitindoNota(false);
        return;
      }
      
      // Usar dados do cliente passados do dialog (já coletados/completados pelo usuário)
      const result = await focusNF.emitirNota({
        orderCode: order.code || code,
        tipoNota: tipoNota,
        cliente: clienteData,
        valorTotal: valorTotal,
        items: items, // Enviar múltiplos itens
      });

      // Sempre recarregar a lista de notas, mesmo se houver erro
      await loadNotasFiscais();

      if (result.ok) {
        toast.success('Nota fiscal emitida com sucesso!');
        setDialogEmitirNotaOpen(false);
      } else {
        toast.error(result.error || 'Erro ao emitir nota fiscal');
      }
    } catch (error: any) {
      // Recarregar lista mesmo em caso de erro para mostrar status atualizado
      await loadNotasFiscais();
      toast.error(error.message || 'Erro ao emitir nota fiscal');
    } finally {
      setEmitindoNota(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!newStatus) {
      toast.error("Selecione um status");
      return;
    }

    try {
      // Atualizando status do pedido
      
      // Atualizar estado local imediatamente para feedback visual
      setLocalStatus(newStatus);
      
      const result = await updateOrderStatus(code, newStatus);
      if (result.ok) {
        toast.success("Status atualizado com sucesso!");
        setIsStatusDialogOpen(false);
        setNewStatus(""); // Limpar o campo
        
          // Status atualizado no banco, mantendo estado local
        
        // Manter o estado local atualizado
        setLocalStatus(newStatus);
        
        // Invalidar cache e recursos relacionados
        invalidateRelated('orders');
        invalidateRelated('receitas'); // Sincronizar receitas também
        // Refetch automático
        queryClient.refetchQueries({ queryKey: ["order", code] });
        queryClient.refetchQueries({ queryKey: ["orders"] });
        queryClient.invalidateQueries({ queryKey: ["receitas"] }); // Invalidar receitas explicitamente
        
      } else {
        console.error("Erro ao atualizar status:", result.error);
        toast.error(result.error || "Erro ao atualizar status");
        
        // Reverter estado local em caso de erro
        setLocalStatus(null);
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
      
      // Reverter estado local em caso de erro
      setLocalStatus(null);
    }
  };

  const handleUpdatePaid = async () => {
    const value = parseFloat(newPaidValue);
    if (isNaN(value) || value < 0) {
      toast.error("Digite um valor válido");
      return;
    }

    try {
      // Atualizando valor pago do pedido
      const result = await updateOrderStatus(code, undefined, value);
      if (result.ok) {
        toast.success("Valor pago atualizado com sucesso!");
        setIsPaidDialogOpen(false);
        setNewPaidValue(""); // Limpar o campo
        
        // Se temos dados atualizados, usar eles diretamente
        if (result.data) {
          // Usando dados atualizados
          // Atualizar o cache do React Query com os dados retornados
          queryClient.setQueryData(["order", code], result.data);
          
          // Forçar re-render imediato
          await queryClient.invalidateQueries({ queryKey: ["order", code] });
          await queryClient.invalidateQueries({ queryKey: ["orders"] });
          await queryClient.invalidateQueries({ queryKey: ["receitas"] }); // Sincronizar receitas
          invalidateRelated('receitas'); // Sincronizar via contexto
          
          // Refetch para garantir consistência
          refetch();
        } else {
          console.warn("Nenhum dado retornado - forçando refetch");
          // Se não temos dados, forçar refetch completo
          await queryClient.invalidateQueries({ queryKey: ["order", code] });
          await queryClient.invalidateQueries({ queryKey: ["orders"] });
          await queryClient.invalidateQueries({ queryKey: ["receitas"] }); // Sincronizar receitas
          invalidateRelated('receitas'); // Sincronizar via contexto
          refetch();
        }
      } else {
        console.error("Erro ao atualizar valor pago:", result.error);
        toast.error(result.error || "Erro ao atualizar valor pago");
      }
    } catch (error) {
      console.error("Erro ao atualizar valor pago:", error);
      toast.error("Erro ao atualizar valor pago");
    }
  };

  const handleUpdateDescription = async () => {
    if (!newDescription.trim()) {
      toast.error("Digite uma descrição válida");
      return;
    }

    try {
      // Atualizando descrição do pedido
      const result = await updateOrderStatus(code, undefined, undefined, newDescription);
      if (result.ok) {
        toast.success("Descrição atualizada com sucesso!");
        setNewDescription(""); // Limpar o campo
        
        // Forçar refetch para atualizar a interface
        await queryClient.invalidateQueries({ queryKey: ["order", code] });
        await queryClient.invalidateQueries({ queryKey: ["orders"] });
        await queryClient.invalidateQueries({ queryKey: ["receitas"] }); // Sincronizar receitas
        invalidateRelated('receitas'); // Sincronizar via contexto
        refetch();
      } else {
        console.error("Erro ao atualizar descrição:", result.error);
        toast.error(result.error || "Erro ao atualizar descrição");
      }
    } catch (error) {
      console.error("Erro ao atualizar descrição:", error);
      toast.error("Erro ao atualizar descrição");
    }
  };

  const { data: orderDb, isLoading, error, refetch } = useQuery({
    queryKey: ["order", code],
    queryFn: () => getOrderByCode(code),
    enabled: Boolean(code),
    refetchOnWindowFocus: false,
    staleTime: 0, // Sempre buscar dados frescos
  });

  // Query para buscar status de pagamento
  const { data: receitaData, isLoading: isLoadingPayment } = useQuery({
    queryKey: ["receita", code],
    queryFn: () => getReceitaByOrderCode(code),
    enabled: Boolean(code),
    refetchOnWindowFocus: false,
    staleTime: 0, // Sempre buscar dados frescos
  });

  // Buscar medidas do cliente
  const { data: medidas = [] } = useQuery({
    queryKey: ["medidas", empresa?.id],
    queryFn: () => getMedidas(empresa?.id || ''),
    enabled: !!empresa?.id && !!orderDb?.customer_name,
  });
  
  // Função para remover duplicatas das personalizações
  const removeDuplicatePersonalizations = useCallback((personalizations: OrderRow["personalizations"] = []) => {
    if (!personalizations || personalizations.length === 0) return [];
    
    // Primeiro, tentar usar IDs únicos se disponíveis
    const seenIds = new Set<string>();
    const seenKeys = new Map<string, typeof personalizations[0]>();
    const uniqueItems: typeof personalizations = [];
    
    personalizations.forEach((item) => {
      // Se o item tem um ID único, usar ele para verificar duplicatas
      if (item.id) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          uniqueItems.push(item);
        } else {
          console.warn(`Personalização duplicada encontrada (ID: ${item.id}):`, item);
        }
      } else {
        // Se não tem ID, usar uma combinação de campos como chave
        const key = `${item.person_name || ''}_${item.size || ''}_${item.quantity || 1}_${item.notes || ''}`;
        
        if (!seenKeys.has(key)) {
          seenKeys.set(key, item);
          uniqueItems.push(item);
        } else {
          console.warn(`Personalização duplicada encontrada (chave: ${key}):`, item);
        }
      }
    });
    
    if (personalizations.length !== uniqueItems.length) {
      console.log(`Removidas ${personalizations.length - uniqueItems.length} personalizações duplicadas. Original: ${personalizations.length}, Único: ${uniqueItems.length}`);
    }
    
    return uniqueItems;
  }, []);

  const order = useMemo(() => {
    if (orderDb) {
      console.log("Dados do pedido recebidos:", orderDb, "forceUpdate:", forceUpdate);
      const personalizations = removeDuplicatePersonalizations(orderDb.personalizations);
      return {
        id: orderDb.code,
        client: orderDb.customer_name,
        type: orderDb.type,
        description: orderDb.description ?? "",
        value: Number(orderDb.value || 0),
        paid: Number(orderDb.paid || 0),
        delivery: orderDb.delivery_date ?? "",
        status: orderDb.status,
        file: orderDb.file_url ?? undefined,
        personalizations: personalizations,
      } as OrderItem;
    }
    return null;
  }, [orderDb, forceUpdate, removeDuplicatePersonalizations]);

  // Função para determinar o status de pagamento
  const getPaymentStatus = () => {
    if (!order) return { status: "unknown", label: "Desconhecido", color: "bg-gray-100 text-gray-600" };
    
    const totalValue = order.value;
    const paidValue = order.paid;
    
    if (paidValue === 0) {
      return { status: "pending", label: "Pendente", color: "bg-yellow-100 text-yellow-800" };
    } else if (paidValue >= totalValue) {
      return { status: "paid", label: "Pago", color: "bg-green-100 text-green-800" };
    } else {
      return { status: "partial", label: "Parcial", color: "bg-blue-100 text-blue-800" };
    }
  };

  const paymentStatus = getPaymentStatus();

  // Função para gerar Ficha Técnica para Funcionários (sem valores financeiros)
  const generateEmployeeTechnicalSheet = () => {
    console.log("=== GERANDO FICHA TÉCNICA PARA FUNCIONÁRIOS ===");
    console.log("Order:", order);
    
    // Gerar HTML da ficha técnica
    const technicalSheetHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ficha Técnica - ${order.id}</title>
          <meta charset="utf-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Arial', sans-serif; 
              line-height: 1.6; 
              color: #333; 
              background: white; 
              padding: 20px; 
            }
            .container { max-width: 800px; margin: 0 auto; }
            .header { 
              text-align: center; 
              margin-bottom: 40px; 
              border-bottom: 3px solid #059669; 
              padding-bottom: 20px; 
            }
            .header h1 { font-size: 28px; font-weight: bold; margin: 0; margin-bottom: 10px; color: #059669; }
            .header .subtitle { font-size: 16px; color: #6b7280; }
            .section { 
              margin-bottom: 30px; 
              background: #f0fdf4;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #059669;
            }
            .section h2 { 
              font-size: 20px; 
              font-weight: bold; 
              margin-bottom: 15px; 
              color: #059669; 
            }
            .grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 20px; 
              margin-bottom: 20px; 
            }
            .item { 
              display: flex; 
              flex-direction: column; 
            }
            .label { 
              font-size: 12px; 
              color: #6b7280; 
              font-weight: bold; 
              text-transform: uppercase; 
              margin-bottom: 5px; 
            }
            .value { 
              font-size: 16px; 
              color: #1f2937; 
              font-weight: 500; 
            }
            .status-badge { 
              display: inline-block; 
              padding: 6px 12px; 
              border-radius: 20px; 
              font-size: 12px; 
              font-weight: bold; 
              background: #f3f4f6; 
              color: #374151; 
            }
            .logo-section { 
              text-align: center; 
              margin: 20px 0; 
              padding: 20px;
              background: white;
              border-radius: 8px;
              border: 2px dashed #d1d5db;
            }
            .logo-section img { 
              max-width: 300px; 
              max-height: 200px; 
              border: 2px solid #e5e7eb; 
              border-radius: 8px; 
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .technical-specs { 
              background: #fef3c7; 
              padding: 20px; 
              border-radius: 8px; 
              border-left: 4px solid #f59e0b; 
            }
            .technical-specs h3 { 
              margin-bottom: 15px; 
              color: #92400e; 
              font-size: 18px; 
            }
            .technical-specs ul { 
              list-style: none; 
              padding: 0; 
            }
            .technical-specs li { 
              margin-bottom: 10px; 
              display: flex; 
              align-items: center; 
              font-size: 14px;
            }
            .technical-specs li span { 
              color: #059669; 
              margin-right: 10px; 
              font-weight: bold; 
            }
            .personal-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            .personal-table th,
            .personal-table td {
              border: 1px solid #d1d5db;
              padding: 8px;
              font-size: 13px;
              text-align: left;
            }
            .personal-table th {
              background: #dcfce7;
              color: #047857;
              text-transform: uppercase;
              font-weight: 700;
            }
            .personal-table td:first-child {
              font-weight: 600;
            }
            .footer { 
              margin-top: 40px; 
              text-align: center; 
              font-size: 12px; 
              color: #6b7280; 
              border-top: 1px solid #e5e7eb; 
              padding-top: 20px; 
            }
            .employee-notice {
              background: #dbeafe;
              border: 2px solid #3b82f6;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 20px;
              text-align: center;
            }
            .employee-notice h3 {
              color: #1e40af;
              font-size: 16px;
              margin-bottom: 5px;
            }
            .employee-notice p {
              color: #1e40af;
              font-size: 14px;
            }
            @media print {
              body { padding: 0; }
              .container { max-width: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>FICHA TÉCNICA DE PRODUÇÃO</h1>
              <div class="subtitle">Código: ${order.id}</div>
              <div class="subtitle">Data: ${new Date().toLocaleDateString('pt-BR')}</div>
            </div>
            
            <div class="employee-notice">
              <h3>📋 DOCUMENTO INTERNO PARA FUNCIONÁRIOS</h3>
              <p>Esta ficha contém apenas informações técnicas necessárias para a produção</p>
            </div>
            
            <div class="section">
              <h2>📋 Informações do Pedido</h2>
              <div class="grid">
                <div class="item">
                  <div class="label">Código</div>
                  <div class="value">${order.id}</div>
                </div>
                <div class="item">
                  <div class="label">Tipo</div>
                  <div class="value">${order.type}</div>
                </div>
                <div class="item">
                  <div class="label">Status</div>
                  <div class="value">
                    <span class="status-badge">${order.status}</span>
                  </div>
                </div>
                <div class="item">
                  <div class="label">Data de Entrega</div>
                  <div class="value">${new Date(order.delivery).toLocaleDateString('pt-BR')}</div>
                </div>
              </div>
            </div>
            
            <div class="section">
              <h2>👤 Informações do Cliente</h2>
              <div class="grid">
                <div class="item">
                  <div class="label">Nome</div>
                  <div class="value">${order.client}</div>
                </div>
                <div class="item">
                  <div class="label">Data de Entrega</div>
                  <div class="value">${new Date(order.delivery).toLocaleDateString('pt-BR')}</div>
                </div>
              </div>
            </div>

            ${order.personalizations && order.personalizations.length ? `
            <div class="section">
              <h2>🧵 Personalizações Individuais</h2>
              <p>Detalhamento das peças personalizadas para produção.</p>
              <table class="personal-table">
                <thead>
                  <tr>
                    <th>Nome / Identificação</th>
                    <th>Tamanho</th>
                    <th>Quantidade</th>
                    <th>Observações</th>
                  </tr>
                </thead>
                <tbody>
                  ${order.personalizations.map((item: any) => `
                    <tr>
                      <td>${item.person_name || ''}</td>
                      <td>${item.size || '—'}</td>
                      <td>${item.quantity ?? 1}</td>
                      <td>${item.notes || ''}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}
            
            ${(() => {
              // Filtrar medidas do cliente atual
              const medidasCliente = medidas.filter(medida => 
                medida.cliente_nome.toLowerCase().includes(order.client.toLowerCase())
              );
              
              if (medidasCliente.length === 0) return '';
              
              return `
                <div class="section">
                  <h2>📏 Medidas do Cliente</h2>
                  ${medidasCliente.map(medida => `
                    <div style="margin-bottom: 20px; padding: 15px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
                      <h3 style="font-size: 16px; font-weight: bold; color: #059669; margin-bottom: 10px;">
                        ${medida.tipo_peca.toUpperCase()}
                      </h3>
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
                        ${medida.busto ? `<div><strong>Busto:</strong> ${medida.busto}cm</div>` : ''}
                        ${medida.cintura ? `<div><strong>Cintura:</strong> ${medida.cintura}cm</div>` : ''}
                        ${medida.quadril ? `<div><strong>Quadril:</strong> ${medida.quadril}cm</div>` : ''}
                        ${medida.ombro ? `<div><strong>Ombro:</strong> ${medida.ombro}cm</div>` : ''}
                        ${medida.largura_costas ? `<div><strong>Larg. Costas:</strong> ${medida.largura_costas}cm</div>` : ''}
                        ${medida.cava_manga ? `<div><strong>Cava Manga:</strong> ${medida.cava_manga}cm</div>` : ''}
                        ${medida.grossura_braco ? `<div><strong>Gross. Braço:</strong> ${medida.grossura_braco}cm</div>` : ''}
                        ${medida.comprimento_manga ? `<div><strong>Comp. Manga:</strong> ${medida.comprimento_manga}cm</div>` : ''}
                        ${medida.cana_braco ? `<div><strong>Cana Braço:</strong> ${medida.cana_braco}cm</div>` : ''}
                        ${medida.alca ? `<div><strong>Alça:</strong> ${medida.alca}cm</div>` : ''}
                        ${medida.pescoco ? `<div><strong>Pescoço:</strong> ${medida.pescoco}cm</div>` : ''}
                        ${medida.comprimento ? `<div><strong>Comprimento:</strong> ${medida.comprimento}cm</div>` : ''}
                        ${medida.coxa ? `<div><strong>Coxa:</strong> ${medida.coxa}cm</div>` : ''}
                        ${medida.tornozelo ? `<div><strong>Tornozelo:</strong> ${medida.tornozelo}cm</div>` : ''}
                        ${medida.comprimento_calca ? `<div><strong>Comp. Calça:</strong> ${medida.comprimento_calca}cm</div>` : ''}
                      </div>
                      ${medida.detalhes_superior ? `
                        <div style="margin-top: 10px; padding: 8px; background: #f3f4f6; border-radius: 4px;">
                          <strong>Detalhes Superiores:</strong> ${medida.detalhes_superior}
                        </div>
                      ` : ''}
                      ${medida.detalhes_inferior ? `
                        <div style="margin-top: 10px; padding: 8px; background: #f3f4f6; border-radius: 4px;">
                          <strong>Detalhes Inferiores:</strong> ${medida.detalhes_inferior}
                        </div>
                      ` : ''}
                      ${medida.observacoes ? `
                        <div style="margin-top: 10px; padding: 8px; background: #fef3c7; border-radius: 4px;">
                          <strong>Observações:</strong> ${medida.observacoes}
                        </div>
                      ` : ''}
                    </div>
                  `).join('')}
                </div>
              `;
            })()}
            
            ${order.file ? `
            <div class="section">
              <h2>🎨 Logo/Arte do Pedido</h2>
              <div class="logo-section">
                <img src="${order.file}" alt="Logo/Arte do Pedido" />
                <p style="margin-top: 10px; font-size: 12px; color: #6b7280;">Arte anexada pelo cliente</p>
              </div>
            </div>
            ` : ''}
            
            <div class="section">
              <h2>📦 Especificações Técnicas</h2>
              <div class="item">
                <div class="label">Descrição Detalhada</div>
                <div class="value">${order.description}</div>
              </div>
            </div>
            
            <div class="section">
              <h2>⚙️ Instruções de Produção</h2>
              <div class="technical-specs">
                <h3>Checklist de Produção</h3>
                <ul>
                  <li><span>✓</span> Verificar especificações técnicas antes de iniciar</li>
                  <li><span>✓</span> Confirmar materiais e insumos necessários</li>
                  <li><span>✓</span> Seguir cronograma de produção estabelecido</li>
                  <li><span>✓</span> Manter controle de qualidade durante o processo</li>
                  <li><span>✓</span> Comunicar eventuais problemas ou atrasos</li>
                  <li><span>✓</span> Finalizar com inspeção final de qualidade</li>
                </ul>
              </div>
            </div>
            
            <div class="footer">
              <p>Gerado em ${new Date().toLocaleString('pt-BR')} - Ateliê Pro</p>
              <p><strong>Documento interno - Não contém informações financeiras</strong></p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    // Abrir nova janela com a ficha técnica
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(technicalSheetHtml);
      newWindow.document.close();
      
      // Aguardar carregamento e abrir diálogo de impressão
      newWindow.onload = () => {
        console.log("Ficha técnica carregada, abrindo diálogo de impressão...");
        newWindow.print();
      };
    } else {
      toast.error("Não foi possível abrir a janela. Verifique se os pop-ups estão bloqueados.");
    }
  };

  // Função para gerar Cupom (Não Fiscal) - Otimizado para impressora térmica
  const generateCupomFiscal = () => {
    if (!order || !empresa) {
      toast.error("Dados insuficientes para gerar cupom");
      return;
    }

    // Formatar CNPJ
    const formatCNPJ = (cnpj: string | undefined) => {
      if (!cnpj) return "";
      const cleaned = cnpj.replace(/\D/g, "");
      if (cleaned.length === 14) {
        return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
      }
      return cnpj;
    };

    // Formatar telefone
    const formatPhone = (phone: string | undefined) => {
      if (!phone) return "";
      const cleaned = phone.replace(/\D/g, "");
      if (cleaned.length === 11) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
      } else if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
      }
      return phone;
    };

    // Formatar valor monetário
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    };

    const now = new Date();
    const dateStr = now.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const timeStr = now.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Gerar número do cupom (usar código do pedido ou timestamp)
    const cupomNumber = order.id || now.getTime().toString().slice(-6);

    // Calcular valores
    const subtotal = order.value;
    const total = order.value;
    const paid = order.paid;
    const remaining = total - paid;

    // Gerar HTML do cupom otimizado para impressora térmica
    const cupomHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cupom - ${order.id}</title>
          <meta charset="utf-8">
          <style>
            * { 
              margin: 0; 
              padding: 0; 
              box-sizing: border-box; 
            }
            body { 
              font-family: 'Courier New', 'Courier', monospace; 
              font-size: 13px; 
              line-height: 1.4; 
              color: #000000 !important; 
              background: white; 
              padding: 5px;
              width: 80mm;
              max-width: 80mm;
              margin: 0 auto;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            * {
              color: #000000 !important;
            }
            .header { 
              text-align: center; 
              margin-bottom: 8px; 
            }
            .header h1 { 
              font-size: 16px; 
              font-weight: bold; 
              margin-bottom: 4px; 
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #000000 !important;
            }
            .header p { 
              font-size: 11px; 
              margin: 1px 0;
              color: #000000 !important;
            }
            .fiscal-notice {
              text-align: center;
              font-weight: bold;
              font-size: 12px;
              margin: 6px 0;
              padding: 4px 0;
              border-top: 2px solid #000000;
              border-bottom: 2px solid #000000;
              color: #000000 !important;
            }
            .info-section {
              margin-bottom: 6px;
              text-align: center;
            }
            .info-line {
              font-size: 12px;
              margin: 2px 0;
              color: #000000 !important;
            }
            .info-label {
              font-weight: bold;
              text-transform: uppercase;
              color: #000000 !important;
            }
            .customer-section {
              margin: 6px 0;
              text-align: center;
              font-size: 12px;
            }
            .item-section {
              margin: 6px 0;
            }
            .item-header {
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              font-weight: bold;
              margin-bottom: 3px;
              text-transform: uppercase;
              color: #000000 !important;
            }
            .item-row {
              font-size: 12px;
              margin: 3px 0;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              color: #000000 !important;
            }
            .item-number {
              width: 25px;
              text-align: left;
              color: #000000 !important;
              font-weight: bold;
            }
            .item-description {
              flex: 1;
              margin: 0 3px;
              text-align: left;
              word-wrap: break-word;
              color: #000000 !important;
              font-weight: bold;
            }
            .item-code {
              width: 40px;
              text-align: center;
              color: #000000 !important;
            }
            .item-quantity {
              width: 70px;
              text-align: right;
              white-space: nowrap;
              color: #000000 !important;
              font-weight: bold;
            }
            .item-value {
              width: 60px;
              text-align: right;
              white-space: nowrap;
              color: #000000 !important;
              font-weight: bold;
            }
            .summary {
              margin-top: 6px;
              border-top: 2px solid #000000;
              padding-top: 4px;
            }
            .summary-line {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              margin: 2px 0;
              color: #000000 !important;
            }
            .summary-total {
              font-weight: bold;
              font-size: 14px;
              color: #000000 !important;
            }
            .payment-info {
              margin: 6px 0;
              padding: 4px 0;
              border-top: 2px dashed #000000;
              border-bottom: 2px dashed #000000;
            }
            .payment-line {
              font-size: 12px;
              margin: 2px 0;
              display: flex;
              justify-content: space-between;
              color: #000000 !important;
              font-weight: bold;
            }
            .footer {
              margin-top: 8px;
              text-align: center;
              font-size: 11px;
            }
            .footer p {
              margin: 2px 0;
              color: #000000 !important;
            }
            .policies {
              margin: 6px 0;
              font-size: 10px;
              padding: 4px 0;
              border-top: 2px dashed #000000;
              border-bottom: 2px dashed #000000;
            }
            .policies p {
              margin: 2px 0;
              text-align: center;
              color: #000000 !important;
              font-weight: bold;
            }
            .legal-notice {
              font-size: 10px;
              margin-top: 6px;
              text-align: center;
              padding: 4px 0;
            }
            .legal-notice p {
              margin: 2px 0;
              color: #000000 !important;
              font-weight: bold;
            }
            .contact {
              margin-top: 6px;
              font-size: 11px;
              text-align: center;
            }
            .contact p {
              color: #000000 !important;
            }
            @media print {
              body { 
                padding: 0;
                margin: 0;
                font-size: 13px !important;
                color: #000000 !important;
                background: white !important;
              }
              @page { 
                size: 80mm auto;
                margin: 0;
                padding: 0;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color: #000000 !important;
                background: white !important;
              }
              .header h1,
              .fiscal-notice,
              .info-line,
              .info-label,
              .item-row,
              .summary-line,
              .summary-total,
              .payment-line,
              .footer p,
              .policies p,
              .legal-notice p,
              .contact p {
                color: #000000 !important;
                font-weight: bold;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${empresa.nome || "ATELIÊ PRO"}</h1>
            ${empresa.endereco ? `<p>${empresa.endereco}</p>` : ""}
            ${empresa.cpf_cnpj ? `<p>CNPJ: ${formatCNPJ(empresa.cpf_cnpj)}</p>` : ""}
            ${empresa.telefone ? `<p>IE: ${formatPhone(empresa.telefone)}</p>` : ""}
          </div>

          <div class="fiscal-notice">
            NAO E DOCUMENTO FISCAL
          </div>

          <div class="info-section">
            <div class="info-line">
              <span class="info-label">VENDA SIMPLES</span>
            </div>
            <div class="info-line">
              <span>Numero: ${cupomNumber}</span>
            </div>
            <div class="info-line">
              <span>${dateStr} ${timeStr}</span>
            </div>
          </div>

          <div class="customer-section">
            <div class="info-line">
              <span class="info-label">Cliente</span>
            </div>
            <div class="info-line">
              <span>${order.client || "CONSUMIDOR"}</span>
            </div>
          </div>

          <div class="item-section">
            <div class="item-header">
              <span class="item-number">###</span>
              <span class="item-description">DESCRICAO</span>
              <span class="item-code">COD</span>
              <span class="item-quantity">QTD UN</span>
              <span class="item-value">VL ITEM</span>
            </div>
            <div class="item-row">
              <span class="item-number">001</span>
              <span class="item-description">${(order.description || order.type || "PRODUTO/SERVIÇO").toUpperCase()}</span>
              <span class="item-code">${order.id.slice(0, 5)}</span>
              <span class="item-quantity">1,000 UN x ${formatCurrency(order.value)}</span>
              <span class="item-value">${formatCurrency(order.value)}</span>
            </div>
          </div>

          <div class="summary">
            <div class="summary-line">
              <span>SUBTOTAL</span>
              <span>${formatCurrency(subtotal)}</span>
            </div>
            <div class="summary-line summary-total">
              <span>TOTAL</span>
              <span>${formatCurrency(total)}</span>
            </div>
            ${paid > 0 ? `
            <div class="summary-line">
              <span>CREDITO (${paid >= total ? 'PAGO' : 'PARCIAL'})</span>
              <span>${formatCurrency(paid)}</span>
            </div>
            ` : ""}
          </div>

          ${paid > 0 && remaining > 0 ? `
          <div class="payment-info">
            <div class="payment-line">
              <span>RESTANTE:</span>
              <span>${formatCurrency(remaining)}</span>
            </div>
          </div>
          ` : ""}

          <div class="footer">
            <p>PDU No.: 1</p>
            <p>Operador: Sistema</p>
            ${empresa.responsavel ? `<p>Vendedor(a): ${empresa.responsavel.toUpperCase()}</p>` : ""}
          </div>

          <div class="policies">
            <p>*** NAO EFETUAMOS TROCAS EM DIAS DE LIQUIDACAO ***</p>
            <p>*** NAO EFETUAMOS TROCAS DE PECAS NA PROMOCAO ***</p>
          </div>

          <div class="legal-notice">
            <p>Sonegar e Crime! Quem paga por ele? Voce!</p>
            <p>Sua unica defesa: Exija a nota fiscal</p>
          </div>

          <div class="contact">
            ${empresa.telefone ? `<p>Telefone: ${formatPhone(empresa.telefone)}</p>` : ""}
          </div>
        </body>
      </html>
    `;

    // Abrir nova janela com o cupom
    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.write(cupomHtml);
      newWindow.document.close();

      // Aguardar carregamento e abrir diálogo de impressão
      newWindow.onload = () => {
        setTimeout(() => {
          newWindow.print();
        }, 250);
      };
    } else {
      toast.error("Não foi possível abrir a janela. Verifique se os pop-ups estão bloqueados.");
    }
  };

  const steps = useMemo(() => {
    const defaultMap = new Map(DEFAULT_ORDER_STATUS_DETAILS.map((detail) => [detail.key, detail]));
    const baseSteps: Array<{ key: OrderItem["status"]; icon: any }> = [
      { key: ORDER_STATUS.AGUARDANDO_APROVACAO as OrderItem["status"], icon: Clock },
      { key: ORDER_STATUS.EM_PRODUCAO as OrderItem["status"], icon: Play },
      { key: ORDER_STATUS.FINALIZANDO as OrderItem["status"], icon: Package },
      { key: ORDER_STATUS.PRONTO as OrderItem["status"], icon: CheckCircle },
      { key: ORDER_STATUS.AGUARDANDO_RETIRADA as OrderItem["status"], icon: Truck },
      { key: ORDER_STATUS.ENTREGUE as OrderItem["status"], icon: CheckCircle2 },
    ];

    return baseSteps.map((step) => {
      const detail = statusDetailsMap.get(step.key);
      const fallback = defaultMap.get(step.key);
      return {
        key: step.key,
        icon: step.icon,
        label: detail?.label ?? fallback?.label ?? step.key,
        description: detail?.description ?? fallback?.description ?? "",
      };
    });
  }, [statusDetailsMap]);

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4 p-4">
            <SidebarTrigger />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/pedidos")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Pedido não encontrado</h1>
              <p className="text-sm text-muted-foreground">Verifique o código e tente novamente</p>
            </div>
          </div>
        </header>
      </div>
    );
  }

  const currentStep = getStatusStepIndex(order.status);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4 p-4">
          <SidebarTrigger />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/pedidos")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{order.id}</h1>
            <p className="text-sm text-muted-foreground">Detalhes do pedido</p>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Informações do Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="text-sm font-medium text-foreground">{order.client}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Entrega</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(order.delivery).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p className="text-sm font-medium text-foreground">{order.type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor / Pago</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">R$ {order.value} / R$ {order.paid}</p>
                    <Dialog open={isPaidDialogOpen} onOpenChange={setIsPaidDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Edit className="w-3 h-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Editar Valor Pago</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="paid">Valor Pago (R$)</Label>
                            <Input
                              id="paid"
                              type="number"
                              step="0.01"
                              placeholder="0,00"
                              value={newPaidValue}
                              onChange={(e) => setNewPaidValue(e.target.value)}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleUpdatePaid} className="flex-1">
                              Atualizar
                            </Button>
                            <Button variant="outline" onClick={() => setIsPaidDialogOpen(false)}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status de Pagamento</p>
                  <div className="flex items-center gap-2 mt-1">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${paymentStatus.color}`}>
                      {paymentStatus.label}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border border-secondary/30 bg-secondary/20 text-secondary">
                    {order.status}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Descrição</p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Edit className="w-3 h-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar Descrição do Pedido</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="description">Descrição</Label>
                          <Input
                            id="description"
                            placeholder="Descrição do pedido"
                            defaultValue={order.description}
                            onChange={(e) => setNewDescription(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleUpdateDescription} className="flex-1">
                            Atualizar
                          </Button>
                          <Button variant="outline" onClick={() => setNewDescription("")}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <p className="text-foreground mt-1">{order.description}</p>
              </div>

              {order.personalizations && order.personalizations.length > 0 && (
                <div className="space-y-2 border-t border-dashed pt-4 mt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Personalizações
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {order.personalizations.length} peça{order.personalizations.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {order.personalizations.map((item, index) => {
                      // Criar uma chave única: usar ID se disponível, senão usar índice + campos únicos
                      const uniqueKey = item.id || `${index}-${item.person_name}-${item.size}-${item.quantity}-${item.notes}`;
                      return (
                        <div
                          key={uniqueKey}
                          className="flex flex-col gap-1 rounded-md border border-border/80 bg-muted/20 p-3 text-xs sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">{item.person_name}</span>
                            <span className="text-muted-foreground">
                              {item.size ? `Tamanho: ${item.size}` : "Tamanho não informado"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <span>Qtd: {item.quantity}</span>
                            {item.notes && (
                              <span className="max-w-[240px] truncate text-muted-foreground/90">
                                {item.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-3 border-t pt-4 mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Arquivo / Arte</p>
                {order.file ? (
                  <div className="space-y-3">
                    {order.file.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ? (
                      <div className="space-y-3">
                        <div className="relative w-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-4 flex items-center justify-center min-h-[200px] max-h-[500px] overflow-hidden">
                          <img
                            src={order.file}
                            alt="Arte do pedido"
                            className="max-w-full max-h-[450px] w-auto h-auto object-contain rounded-lg shadow-sm"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `
                                  <div class="p-4 border border-border rounded-lg text-center">
                                    <p class="text-sm text-muted-foreground mb-2">Não foi possível carregar a imagem.</p>
                                    <a href="${order.file}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline flex items-center justify-center">
                                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                                      </svg>
                                      Baixar arquivo
                                    </a>
                                  </div>
                                `;
                              }
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <p className="text-xs text-muted-foreground">
                            Pré-visualização da arte anexada
                          </p>
                          <Button
                            asChild
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <a
                              href={order.file}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Baixar arquivo completo
                            </a>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center bg-gray-50">
                        <p className="text-sm text-muted-foreground mb-3">Arquivo anexado</p>
                        <Button
                          asChild
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <a
                            href={order.file}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Baixar arquivo
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Nenhum arquivo enviado</div>
                )}
              </div>

              {/* Seção de Medidas do Cliente */}
              {medidas.filter(medida => 
                medida.cliente_nome.toLowerCase().includes(order.client.toLowerCase())
              ).length > 0 && (
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">Medidas do Cliente</p>
                  </div>
                  <div className="space-y-3">
                    {medidas
                      .filter(medida => 
                        medida.cliente_nome.toLowerCase().includes(order.client.toLowerCase())
                      )
                      .map((medida) => (
                        <div key={medida.id} className="p-3 bg-muted/50 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-primary">
                              {medida.tipo_peca.toUpperCase()}
                            </h4>
                            <span className="text-xs text-muted-foreground">
                              {new Date(medida.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                            {medida.busto && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Busto:</span>
                                <span className="font-medium">{medida.busto}cm</span>
                              </div>
                            )}
                            {medida.cintura && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Cintura:</span>
                                <span className="font-medium">{medida.cintura}cm</span>
                              </div>
                            )}
                            {medida.quadril && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Quadril:</span>
                                <span className="font-medium">{medida.quadril}cm</span>
                              </div>
                            )}
                            {medida.ombro && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Ombro:</span>
                                <span className="font-medium">{medida.ombro}cm</span>
                              </div>
                            )}
                            {medida.largura_costas && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Larg. Costas:</span>
                                <span className="font-medium">{medida.largura_costas}cm</span>
                              </div>
                            )}
                            {medida.cava_manga && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Cava Manga:</span>
                                <span className="font-medium">{medida.cava_manga}cm</span>
                              </div>
                            )}
                            {medida.grossura_braco && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Gross. Braço:</span>
                                <span className="font-medium">{medida.grossura_braco}cm</span>
                              </div>
                            )}
                            {medida.comprimento_manga && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Comp. Manga:</span>
                                <span className="font-medium">{medida.comprimento_manga}cm</span>
                              </div>
                            )}
                            {medida.cana_braco && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Cana Braço:</span>
                                <span className="font-medium">{medida.cana_braco}cm</span>
                              </div>
                            )}
                            {medida.alca && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Alça:</span>
                                <span className="font-medium">{medida.alca}cm</span>
                              </div>
                            )}
                            {medida.pescoco && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Pescoço:</span>
                                <span className="font-medium">{medida.pescoco}cm</span>
                              </div>
                            )}
                            {medida.comprimento && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Comprimento:</span>
                                <span className="font-medium">{medida.comprimento}cm</span>
                              </div>
                            )}
                            {medida.coxa && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Coxa:</span>
                                <span className="font-medium">{medida.coxa}cm</span>
                              </div>
                            )}
                            {medida.tornozelo && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Tornozelo:</span>
                                <span className="font-medium">{medida.tornozelo}cm</span>
                              </div>
                            )}
                            {medida.comprimento_calca && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Comp. Calça:</span>
                                <span className="font-medium">{medida.comprimento_calca}cm</span>
                              </div>
                            )}
                          </div>
                          
                          {(medida.detalhes_superior || medida.detalhes_inferior || medida.observacoes) && (
                            <div className="mt-3 space-y-2">
                              {medida.detalhes_superior && (
                                <div className="p-2 bg-blue-50 rounded text-xs">
                                  <strong className="text-blue-800">Detalhes Superiores:</strong>
                                  <span className="text-blue-700 ml-1">{medida.detalhes_superior}</span>
                                </div>
                              )}
                              {medida.detalhes_inferior && (
                                <div className="p-2 bg-blue-50 rounded text-xs">
                                  <strong className="text-blue-800">Detalhes Inferiores:</strong>
                                  <span className="text-blue-700 ml-1">{medida.detalhes_inferior}</span>
                                </div>
                              )}
                              {medida.observacoes && (
                                <div className="p-2 bg-yellow-50 rounded text-xs">
                                  <strong className="text-yellow-800">Observações:</strong>
                                  <span className="text-yellow-700 ml-1">{medida.observacoes}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-gray-200/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" />
                Timeline de Produção
              </CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full border border-dashed border-muted-foreground/40 hover:border-muted-foreground/70 hover:bg-muted/40"
                    onClick={handleOpenCustomizeStatuses}
                  >
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Personalizar etapas</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" align="end">
                  Personalizar etapas da timeline
                </TooltipContent>
              </Tooltip>
            </CardHeader>
            <Dialog
              open={isCustomizeDialogOpen}
              onOpenChange={(open) => {
                setIsCustomizeDialogOpen(open);
                if (open) {
                  setStatusDraft(statusDetails.map((detail) => ({ ...detail })));
                }
              }}
            >
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Personalizar etapas da produção</DialogTitle>
                  <DialogDescription>
                    Renomeie as etapas exibidas na timeline e nos menus de status para combinar com o fluxo do seu ateliê.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {statusDraft.map((status) => {
                    const baseId = status.key
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .replace(/[^a-zA-Z0-9]+/g, "-")
                      .toLowerCase();

                    return (
                      <div key={status.key} className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Etapa original</p>
                          <p className="text-sm font-semibold text-foreground">{status.defaultLabel}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusDraftRestore(status.key)}
                          disabled={
                            status.label === status.defaultLabel &&
                            status.description === status.defaultDescription
                          }
                        >
                          Restaurar padrão
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`status-label-${baseId}`}>Nome exibido</Label>
                        <Input
                          id={`status-label-${baseId}`}
                          value={status.label}
                          onChange={(event) =>
                            handleStatusDraftChange(status.key, "label", event.target.value)
                          }
                          maxLength={60}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`status-description-${baseId}`}>Descrição (opcional)</Label>
                        <Textarea
                          id={`status-description-${baseId}`}
                          value={status.description}
                          onChange={(event) =>
                            handleStatusDraftChange(status.key, "description", event.target.value)
                          }
                          maxLength={160}
                          placeholder={status.defaultDescription}
                        />
                      </div>
                    </div>
                    );
                  })}
                </div>
                <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    variant="ghost"
                    onClick={handleResetStatuses}
                    disabled={isResettingStatusConfigs}
                  >
                    {isResettingStatusConfigs && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Restaurar todas
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsCustomizeDialogOpen(false)}
                      disabled={isSavingStatusConfigs}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveStatusDraft} disabled={isSavingStatusConfigs}>
                      {isSavingStatusConfigs && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar alterações
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <CardContent>
              <div className="space-y-6">
                {steps.map((step, index) => {
                  const isDone = index <= currentStep;
                  const isCurrent = index === currentStep;
                  const IconComponent = step.icon;
                  
                  return (
                    <div key={step.key} className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                        isDone 
                          ? 'bg-green-100 border-green-500 text-green-600' 
                          : isCurrent
                          ? 'bg-blue-100 border-blue-500 text-blue-600'
                          : 'bg-gray-100 border-gray-300 text-gray-400'
                      }`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium ${
                          isDone ? 'text-green-700' : isCurrent ? 'text-blue-700' : 'text-gray-500'
                        }`}>
                          {step.label}
                        </div>
                        <div className={`text-sm ${
                          isDone ? 'text-green-600' : isCurrent ? 'text-blue-600' : 'text-gray-400'
                        }`}>
                          {step.description}
                        </div>
                        {isCurrent && (
                          <div className="mt-2">
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border border-blue-200 bg-blue-50 text-blue-700">
                              Status Atual
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notas Fiscais */}
        <Card className="bg-white border border-gray-200/50 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                Notas Fiscais
              </CardTitle>
              <div className="flex items-center gap-2">
                {!empresa?.tem_nota_fiscal && (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border border-dashed border-amber-300 bg-amber-50 text-amber-700">
                    Exclusivo do plano Profissional
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (!empresa?.tem_nota_fiscal) {
                      toast.info('Visualize e gerencie suas notas fiscais assinando o plano Profissional (com NF).');
                      navigate('/assinatura');
                      return;
                    }
                    navigate('/notas-fiscais');
                  }}
                  className={!empresa?.tem_nota_fiscal ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50' : ''}
                >
                  Ver Todas
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {empresa?.tem_nota_fiscal && notasFiscais.length > 0 ? (
                <div className="space-y-2">
                  {notasFiscais.map((nota) => {
                      const isErro = nota.status === 'erro_emissao';
                      const isProcessando = nota.status === 'processando_autorizacao';
                      
                      return (
                        <div 
                          key={nota.id} 
                          className={`flex items-start justify-between p-3 border rounded-lg ${
                            isErro || nota.status === 'erro_autorizacao' || nota.status === 'denegado' ? 'border-red-200 bg-red-50' : 
                            isProcessando ? 'border-yellow-200 bg-yellow-50' : 
                            nota.status === 'cancelado' ? 'border-gray-200 bg-gray-50' :
                            nota.status === 'autorizado' || nota.status === 'autorizada' ? 'border-green-200 bg-green-50' :
                            'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex-1">
                            <p className="font-medium">NFe {nota.numero || nota.ref}</p>
                            <p className={`text-sm mt-1 ${
                              isErro ? 'text-red-700' : 
                              isProcessando ? 'text-yellow-700' : 
                              'text-green-700'
                            }`}>
                              Status: {
                                nota.status === 'erro_emissao' || nota.status === 'erro_autorizacao' ? '❌ Erro na Emissão' :
                                nota.status === 'processando_autorizacao' ? '⏳ Processando Autorização' :
                                nota.status === 'autorizado' || nota.status === 'autorizada' ? '✅ Autorizada' :
                                nota.status === 'cancelado' ? '❌ Cancelada' :
                                nota.status === 'denegado' ? '⚠️ Denegada' :
                                nota.status
                              }
                            </p>
                            {nota.erro_mensagem && (
                              <p className="text-xs text-red-600 mt-1 italic">
                                {nota.erro_mensagem.length > 100 
                                  ? nota.erro_mensagem.substring(0, 100) + '...' 
                                  : nota.erro_mensagem}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {nota.status === 'processando_autorizacao' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleConsultarNota(nota.ref)}
                                disabled={consultandoNota === nota.ref}
                              >
                                {consultandoNota === nota.ref ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                )}
                                Consultar
                              </Button>
                            )}
                            {nota.status === 'autorizado' && (
                              <>
                                {nota.xml_url && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const baseUrl = nota.ambiente === 'producao' 
                                        ? 'https://api.focusnfe.com.br'
                                        : 'https://homologacao.focusnfe.com.br';
                                      window.open(`${baseUrl}${nota.xml_url}`, '_blank');
                                    }}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    XML
                                  </Button>
                                )}
                                {nota.danfe_url && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const baseUrl = nota.ambiente === 'producao' 
                                        ? 'https://api.focusnfe.com.br'
                                        : 'https://homologacao.focusnfe.com.br';
                                      window.open(`${baseUrl}${nota.danfe_url}`, '_blank');
                                    }}
                                  >
                                    <FileText className="h-4 w-4 mr-2" />
                                    DANFE
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate('/notas-fiscais')}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Detalhes
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {empresa?.tem_nota_fiscal
                      ? 'Nenhuma nota fiscal emitida para este pedido'
                      : 'Recurso disponível no plano Profissional (com NF). Atualize seu plano para emitir e acompanhar notas fiscais por aqui.'}
                  </p>
                </div>
              )}
              <Button
                onClick={() => {
                  if (!empresa?.tem_nota_fiscal) {
                    toast.info('Emita notas fiscais assinando o plano Profissional (com NF).');
                    navigate('/assinatura');
                    return;
                  }
                  handleEmitirNota();
                }}
                disabled={emitindoNota}
                aria-disabled={!empresa?.tem_nota_fiscal}
                className={`w-full ${!empresa?.tem_nota_fiscal ? 'bg-gray-100 text-gray-500 hover:bg-gray-100 cursor-pointer border border-dashed border-gray-300' : ''}`}
              >
                <FileText className="mr-2 h-4 w-4" />
                {empresa?.tem_nota_fiscal ? 'Emitir Nota Fiscal' : 'Disponível no plano Profissional'}
              </Button>
              {!empresa?.tem_nota_fiscal && (
                <p className="text-xs text-gray-500 text-center">
                  Assine o plano Profissional (com NF) para liberar esta funcionalidade.
                </p>
              )}

              {/* Dialog para configurar itens */}
              <DialogEmitirNota
                open={dialogEmitirNotaOpen}
                onOpenChange={setDialogEmitirNotaOpen}
                onEmitir={handleConfirmarEmitirNota}
                valorTotalPadrao={order?.value || 0}
                orderCode={order?.code || code}
                loading={emitindoNota}
                clienteInicial={clienteInicial}
              />
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        <Card className="bg-white border border-gray-200/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Printer className="w-5 h-5 text-purple-600" />
              Ações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                onClick={() => navigate(`/pedidos/${order.id}/producao`)}
                className="w-full sm:flex-1"
              >
                <Printer className="w-4 h-4 mr-2" />
                Gerar Ordem de Produção
              </Button>
              <Button
                onClick={generateEmployeeTechnicalSheet}
                variant="outline"
                className="w-full sm:flex-1"
              >
                <Users className="w-4 h-4 mr-2" />
                Ficha Técnica Funcionários
              </Button>
              <Button
                onClick={generateCupomFiscal}
                variant="outline"
                className="w-full sm:flex-1"
              >
                <FileText className="w-4 h-4 mr-2" />
                Imprimir Cupom
              </Button>
              <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full sm:flex-1">
                    <Upload className="w-4 h-4 mr-2" />
                    Atualizar Status
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Atualizar Status do Pedido</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="status">Novo Status</Label>
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleUpdateStatus} className="flex-1">
                        Atualizar
                      </Button>
                      <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}