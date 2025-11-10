import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getOrderStatusConfigs,
  resetOrderStatusConfigs,
  saveOrderStatusConfigs,
  OrderStatusConfigInput,
  OrderStatusKey,
} from "@/integrations/supabase/orderStatusConfig";
import { DEFAULT_ORDER_STATUS_DETAILS, ORDER_STATUS } from "@/utils/statusConstants";

export type OrderStatusDetail = {
  key: OrderStatusKey;
  label: string;
  description: string;
  defaultLabel: string;
  defaultDescription: string;
};

export function useOrderStatusConfig() {
  const queryClient = useQueryClient();

  const {
    data: customConfigs = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["orderStatusConfig"],
    queryFn: getOrderStatusConfigs,
    staleTime: 60 * 1000,
  });

  const statusDetails: OrderStatusDetail[] = useMemo(() => {
    const customMap = new Map(customConfigs.map((config) => [config.status_key, config]));

    return DEFAULT_ORDER_STATUS_DETAILS.map((defaultDetail) => {
      const custom = customMap.get(defaultDetail.key);
      return {
        key: defaultDetail.key as OrderStatusKey,
        label: custom?.label || defaultDetail.label,
        description: custom?.description || defaultDetail.description,
        defaultLabel: defaultDetail.label,
        defaultDescription: defaultDetail.description,
      };
    });
  }, [customConfigs]);

  const statusOptions = useMemo(() => {
    const options = statusDetails.map((detail) => ({
      value: detail.key,
      label: detail.label,
    }));

    if (!options.find((option) => option.value === ORDER_STATUS.CANCELADO)) {
      options.push({
        value: ORDER_STATUS.CANCELADO,
        label: "Cancelado",
      });
    }

    return options;
  }, [statusDetails]);

  const saveMutation = useMutation({
    mutationFn: (configs: OrderStatusConfigInput[]) => saveOrderStatusConfigs(configs),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["orderStatusConfig"] });
    },
  });

  const resetMutation = useMutation({
    mutationFn: resetOrderStatusConfigs,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["orderStatusConfig"] });
    },
  });

  return {
    statusDetails,
    statusOptions,
    isLoading,
    error: error as Error | null,
    saveStatusConfigs: saveMutation.mutateAsync,
    resetStatusConfigs: resetMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isResetting: resetMutation.isPending,
  };
}

