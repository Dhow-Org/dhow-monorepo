import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Decision, DisburseResult, InvoiceRow, PoolStats, ReputationView } from "../lib/types";

export interface ChainConfig {
  chainId: number;
  usdc: `0x${string}`;
  financingPool: `0x${string}`;
}

export function useConfig() {
  return useQuery({ queryKey: ["config"], queryFn: () => api<ChainConfig>("/config", { auth: false }), staleTime: Infinity });
}

export function useInvoices(wallet: string | undefined) {
  return useQuery({
    queryKey: ["invoices", wallet],
    queryFn: () => api<InvoiceRow[]>("/invoices"),
    enabled: Boolean(wallet),
  });
}

export function useBills(wallet: string | undefined) {
  return useQuery({
    queryKey: ["bills", wallet],
    queryFn: () => api<InvoiceRow[]>("/invoices/bills"),
    enabled: Boolean(wallet),
  });
}

export function usePool() {
  return useQuery({ queryKey: ["pool"], queryFn: () => api<PoolStats>("/pool") });
}

export function useReportRepayment() {
  return useMutation({
    mutationFn: (vars: { advanceOnChainId: number; txHash: string }) =>
      api<{ recorded: boolean; repaid: boolean }>("/invoices/report-repayment", { method: "POST", body: vars }),
  });
}

export function useReputation(wallet: string | undefined) {
  return useQuery({
    queryKey: ["reputation", wallet],
    queryFn: () => api<ReputationView>(`/reputation/${wallet}`),
    enabled: Boolean(wallet),
  });
}

export function useAssess() {
  return useMutation({
    mutationFn: (vars: { invoiceId: string; requestedAdvancePct?: number }) =>
      api<Decision>(`/invoices/${vars.invoiceId}/assess`, {
        method: "POST",
        body: { requestedAdvancePct: vars.requestedAdvancePct },
      }),
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      supplier: string;
      debtor?: string;
      asset: string;
      amount: string;
      dueDate: number;
      externalRef: string;
      docHash: string;
    }) => api<InvoiceRow>("/invoices", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useVerifyInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<InvoiceRow>(`/invoices/${id}/verify`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useDisburse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { invoiceId: string; requestedAdvancePct?: number }) =>
      api<DisburseResult>(`/invoices/${vars.invoiceId}/disburse`, {
        method: "POST",
        body: { requestedAdvancePct: vars.requestedAdvancePct },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}
