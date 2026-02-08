import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Indicacao {
  id: string;
  user_id: string;
  cliente_indicado_id: string | null;
  codigo_indicacao: string;
  bonus: number;
  status: "pendente" | "aprovado" | "pago";
  created_at: string;
  updated_at: string;
  cliente?: {
    nome: string;
    whatsapp: string;
  };
}

export function useIndicacoes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch indicações with client details
  const { data: indicacoes = [], isLoading } = useQuery({
    queryKey: ["indicacoes"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("indicacoes")
        .select(`
          *,
          cliente:clientes!cliente_indicado_id (nome, whatsapp)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Indicacao[];
    },
  });

  // Fetch clients who were referred (have indicador field set)
  const { data: clientesIndicados = [] } = useQuery({
    queryKey: ["clientes-indicados"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, whatsapp, indicador, created_at, plano")
        .not("indicador", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Calculate stats
  const stats = {
    totalIndicacoes: indicacoes.length,
    saldoDisponivel: indicacoes
      .filter((i) => i.status === "aprovado")
      .reduce((acc, i) => acc + Number(i.bonus), 0),
    resgatesPagos: indicacoes
      .filter((i) => i.status === "pago")
      .reduce((acc, i) => acc + Number(i.bonus), 0),
  };

  const updateIndicacao = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from("indicacoes")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indicacoes"] });
      toast({ title: "Indicação atualizada!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });

  return {
    indicacoes,
    clientesIndicados,
    stats,
    isLoading,
    updateIndicacao,
  };
}
