import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Cliente, Plano, Produto } from '@/types/database';
import { useCurrentUser } from './useCurrentUser';

// Utility to fetch all rows bypassing Supabase 1000-row limit
async function fetchAllRows<T>(
  table: 'clientes' | 'planos' | 'produtos',
  userId: string,
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  let allRows: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allRows = allRows.concat(data as T[]);
    hasMore = data.length === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  return allRows;
}

interface MetricasClientes {
  totalClientes: number;
  clientesAtivos: number;
  clientesVencidos: number;
  clientesNovosHoje: number;
  clientesNovosData: Array<{ day: string; total: number; }>;
  loading: boolean;
  error: string | null;
}

interface MetricasPagamentos {
  totalPagamentos: number;
  valorTotalMes: number;
  mediaPorDia: number;
  pagamentosData: Array<{ day: string; valor: number; }>;
  loading: boolean;
  error: string | null;
}

interface MetricasRenovacoes {
  totalRenovacoes: number;
  renovacoesHoje: number;
  mediaPorDia: number;
  renovacoesData: Array<{ day: string; total: number; }>;
  loading: boolean;
  error: string | null;
}

export function useMetricasClientes(): MetricasClientes {
  const { userId } = useCurrentUser();
  const [metricas, setMetricas] = useState<MetricasClientes>({
    totalClientes: 0,
    clientesAtivos: 0,
    clientesVencidos: 0,
    clientesNovosHoje: 0,
    clientesNovosData: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (userId) {
      carregarMetricasClientes();
    }
  }, [userId]);

  const carregarMetricasClientes = async () => {
    try {
      if (!userId) return;
      
      setMetricas(prev => ({ ...prev, loading: true, error: null }));

      const clientes = await fetchAllRows<Cliente>('clientes', userId);

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const inicioMesAtual = new Date();
      inicioMesAtual.setDate(1);
      inicioMesAtual.setHours(0, 0, 0, 0);

      const clientesDoMesAtual = clientes.filter(cliente => {
        const dataCliente = new Date(cliente.created_at || '');
        return dataCliente >= inicioMesAtual;
      });

      const clientesNovosHoje = clientes.filter(cliente => {
        const dataCliente = new Date(cliente.created_at || '');
        dataCliente.setHours(0, 0, 0, 0);
        return dataCliente.getTime() === hoje.getTime();
      }).length;

      const clientesNovosData = [];
      for (let i = 6; i >= 0; i--) {
        const data = new Date();
        data.setDate(data.getDate() - i);
        data.setHours(0, 0, 0, 0);
        
        const clientesDoDia = clientes.filter(cliente => {
          const dataCliente = new Date(cliente.created_at || '');
          dataCliente.setHours(0, 0, 0, 0);
          return dataCliente.getTime() === data.getTime();
        }).length;

        clientesNovosData.push({
          day: `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth() + 1).toString().padStart(2, '0')}/${data.getFullYear()}`,
          total: clientesDoDia
        });
      }

      const agora = new Date();
      let clientesAtivos = 0;
      let clientesVencidos = 0;

      clientes.forEach(cliente => {
        if (!cliente.data_vencimento) {
          clientesAtivos++;
        } else {
          const dataVencimento = new Date(cliente.data_vencimento);
          if (dataVencimento >= agora) {
            clientesAtivos++;
          } else {
            clientesVencidos++;
          }
        }
      });

      setMetricas({
        totalClientes: clientesDoMesAtual.length,
        clientesAtivos,
        clientesVencidos,
        clientesNovosHoje,
        clientesNovosData,
        loading: false,
        error: null,
      });

    } catch (error) {
      console.error('Erro ao carregar métricas de clientes:', error);
      setMetricas(prev => ({
        ...prev,
        loading: false,
        error: 'Erro ao carregar métricas de clientes',
      }));
    }
  };

  return metricas;
}

export function useMetricasPagamentos(): MetricasPagamentos {
  const { userId } = useCurrentUser();
  const [metricas, setMetricas] = useState<MetricasPagamentos>({
    totalPagamentos: 0,
    valorTotalMes: 0,
    mediaPorDia: 0,
    pagamentosData: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (userId) {
      carregarMetricasPagamentos();
    }
  }, [userId]);

  const carregarMetricasPagamentos = async () => {
    try {
      if (!userId) return;
      
      setMetricas(prev => ({ ...prev, loading: true, error: null }));

      const [clientes, planos] = await Promise.all([
        fetchAllRows<Cliente>('clientes', userId),
        fetchAllRows<Plano>('planos', userId)
      ]);

      const planosMap = new Map(planos.map(p => [p.id!, p]));

      let valorTotalMes = 0;
      let totalPagamentos = 0;

      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      clientes.forEach(cliente => {
        const dataCliente = new Date(cliente.created_at || '');
        if (dataCliente >= inicioMes && cliente.plano && planosMap.has(cliente.plano)) {
          const plano = planosMap.get(cliente.plano)!;
          const valorStr = plano.valor.replace(/[R$\s]/g, '').replace(',', '.');
          const valor = parseFloat(valorStr);
          
          if (!isNaN(valor)) {
            valorTotalMes += valor;
            totalPagamentos++;
          }
        }
      });

      const pagamentosData = [];
      for (let i = 6; i >= 0; i--) {
        const data = new Date();
        data.setDate(data.getDate() - i);
        data.setHours(0, 0, 0, 0);
        
        let valorDoDia = 0;
        clientes.forEach(cliente => {
          const dataCliente = new Date(cliente.created_at || '');
          dataCliente.setHours(0, 0, 0, 0);
          
          if (dataCliente.getTime() === data.getTime() && cliente.plano && planosMap.has(cliente.plano)) {
            const plano = planosMap.get(cliente.plano)!;
            const valorStr = plano.valor.replace(/[R$\s]/g, '').replace(',', '.');
            const valor = parseFloat(valorStr);
            
            if (!isNaN(valor)) {
              valorDoDia += valor;
            }
          }
        });

        pagamentosData.push({
          day: `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth() + 1).toString().padStart(2, '0')}/${data.getFullYear()}`,
          valor: valorDoDia
        });
      }

      const diasNoMes = new Date().getDate();
      const mediaPorDia = valorTotalMes / diasNoMes;

      setMetricas({
        totalPagamentos,
        valorTotalMes,
        mediaPorDia,
        pagamentosData,
        loading: false,
        error: null,
      });

    } catch (error) {
      console.error('Erro ao carregar métricas de pagamentos:', error);
      setMetricas(prev => ({
        ...prev,
        loading: false,
        error: 'Erro ao carregar métricas de pagamentos',
      }));
    }
  };

  return metricas;
}

export function useMetricasRenovacoes(): MetricasRenovacoes {
  const { userId } = useCurrentUser();
  const [metricas, setMetricas] = useState<MetricasRenovacoes>({
    totalRenovacoes: 0,
    renovacoesHoje: 0,
    mediaPorDia: 0,
    renovacoesData: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (userId) {
      carregarMetricasRenovacoes();
    }
  }, [userId]);

  const carregarMetricasRenovacoes = async () => {
    try {
      if (!userId) return;
      
      setMetricas(prev => ({ ...prev, loading: true, error: null }));

      const clientes = await fetchAllRows<Cliente>('clientes', userId);

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const inicioMesAtual = new Date();
      inicioMesAtual.setDate(1);
      inicioMesAtual.setHours(0, 0, 0, 0);

      const clientesRenovados = clientes.filter(cliente => {
        const dataCriacao = new Date(cliente.created_at || '');
        const dataVencimento = cliente.data_vencimento ? new Date(cliente.data_vencimento) : null;
        return dataCriacao < inicioMesAtual && dataVencimento && dataVencimento > hoje;
      });

      const totalRenovacoes = clientesRenovados.length;

      const renovacoesHoje = clientes.filter(cliente => {
        const dataVencimento = cliente.data_vencimento ? new Date(cliente.data_vencimento) : null;
        if (!dataVencimento) return false;
        const seteDiasFrente = new Date();
        seteDiasFrente.setDate(seteDiasFrente.getDate() + 7);
        return dataVencimento >= hoje && dataVencimento <= seteDiasFrente;
      }).length;

      const renovacoesData = [];
      for (let i = 6; i >= 0; i--) {
        const data = new Date();
        data.setDate(data.getDate() - i);
        data.setHours(0, 0, 0, 0);
        
        const renovacoesDoDia = clientes.filter(cliente => {
          const dataCriacao = new Date(cliente.created_at || '');
          const dataVencimento = cliente.data_vencimento ? new Date(cliente.data_vencimento) : null;
          if (dataCriacao >= inicioMesAtual || !dataVencimento) return false;
          const dataVencimentoFormatada = new Date(dataVencimento);
          dataVencimentoFormatada.setHours(0, 0, 0, 0);
          return dataVencimentoFormatada.getTime() === data.getTime();
        }).length;

        renovacoesData.push({
          day: `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth() + 1).toString().padStart(2, '0')}/${data.getFullYear()}`,
          total: renovacoesDoDia
        });
      }

      const diasNoMes = new Date().getDate();
      const mediaPorDia = totalRenovacoes / diasNoMes;

      setMetricas({
        totalRenovacoes,
        renovacoesHoje,
        mediaPorDia,
        renovacoesData,
        loading: false,
        error: null,
      });

    } catch (error) {
      console.error('Erro ao carregar métricas de renovações:', error);
      setMetricas(prev => ({
        ...prev,
        loading: false,
        error: 'Erro ao carregar métricas de renovações',
      }));
    }
  };

  return metricas;
}
