
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Cliente, Plano, Produto } from '@/types/database';
import { useCurrentUser } from './useCurrentUser';
import { logPainel } from '@/utils/logger';

interface TransacaoFinanceira {
  id: string;
  cliente: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  data: string;
  detalheTitulo: string;
  detalheValor: string;
  isCustom?: boolean; // Para diferenciar transações customizadas das automáticas
  descricao?: string; // Descrição original para transações customizadas
}

interface NovaTransacao {
  valor: number;
  tipo: 'entrada' | 'saida';
  descricao: string;
}

interface DadosFinanceiros {
  entradas: number;
  saidas: number;
  lucros: number;
  lucrosMes: number;
  lucrosAno: number;
  transacoes: TransacaoFinanceira[];
  loading: boolean;
  error: string | null;
  salvarTransacao: (transacao: NovaTransacao) => Promise<void>;
  editarTransacao: (id: string, transacao: NovaTransacao) => Promise<void>;
  excluirTransacao: (id: string) => Promise<void>;
}

export function useFinanceiro(): DadosFinanceiros {
  const { userId } = useCurrentUser();
  const [dados, setDados] = useState({
    entradas: 0,
    saidas: 0,
    lucros: 0,
    lucrosMes: 0,
    lucrosAno: 0,
    transacoes: [] as TransacaoFinanceira[],
    loading: true,
    error: null as string | null,
  });

  useEffect(() => {
    if (userId) {
      carregarDadosFinanceiros();
    }
  }, [userId]);


  const carregarDadosFinanceiros = async () => {
    try {
      if (!userId) return;
      
      setDados(prev => ({ ...prev, loading: true, error: null }));

      // Carregamento dos dados financeiros

      // Buscar clientes, planos e produtos
      const [clientesRes, planosRes, produtosRes] = await Promise.all([
        supabase.from('clientes').select('*'),
        supabase.from('planos').select('*'),
        supabase.from('produtos').select('*')
      ]);

      // Buscar transações customizadas com fallback
      let transacoesRes: { data: any[] | null; error: any } = { data: [], error: null };
      try {
        transacoesRes = await supabase
          .from('transacoes')
          .select('*')
          .order('created_at', { ascending: false });
      } catch {
        // Tabela de transações ainda não criada
      }

      if (clientesRes.error) throw clientesRes.error;
      if (planosRes.error) throw planosRes.error;
      if (produtosRes.error) throw produtosRes.error;

      const clientes = clientesRes.data as Cliente[];
      const planos = planosRes.data as Plano[];
      const produtos = produtosRes.data as Produto[];
      const transacoesCustomizadas = transacoesRes.data || [];

      // Dados carregados com sucesso

      // Criar mapas usando IDs em vez de nomes
      const planosMap = new Map(planos.map(p => [p.id!, p]));
      const produtosMap = new Map(produtos.map(p => [p.id!, p]));

      let totalEntradas = 0;
      let totalSaidas = 0;
      let entradasMes = 0;
      let saidasMes = 0;
      let entradasAno = 0;
      let saidasAno = 0;
      const transacoes: TransacaoFinanceira[] = [];

      const now = new Date();
      const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
      const inicioAno = new Date(now.getFullYear(), 0, 1);

      // Processar clientes para calcular entradas (planos)
      clientes.forEach(cliente => {
        if (cliente.plano && planosMap.has(cliente.plano)) {
          const plano = planosMap.get(cliente.plano)!;
          const valorStr = plano.valor.replace(/[R$\s]/g, '').replace(',', '.');
          const valorPlano = parseFloat(valorStr);
          
          if (!isNaN(valorPlano)) {
            const dataCliente = new Date(cliente.created_at || '');
            totalEntradas += valorPlano;
            if (dataCliente >= inicioMes) entradasMes += valorPlano;
            if (dataCliente >= inicioAno) entradasAno += valorPlano;
            
            transacoes.push({
              id: `entrada-${cliente.id}`,
              cliente: cliente.nome,
              tipo: 'entrada',
              valor: valorPlano,
              data: new Date(cliente.created_at || new Date()).toLocaleString('pt-BR'),
              detalheTitulo: 'Plano',
              detalheValor: plano.nome,
              isCustom: false,
            });
          }
        }

        // Processar produtos como saídas
        if (cliente.produto && produtosMap.has(cliente.produto)) {
          const produto = produtosMap.get(cliente.produto)!;
          const valorStr = produto.valor.replace(/[R$\s]/g, '').replace(',', '.');
          const valorProduto = parseFloat(valorStr);
          
          if (!isNaN(valorProduto)) {
            const dataCliente = new Date(cliente.created_at || '');
            totalSaidas += valorProduto;
            if (dataCliente >= inicioMes) saidasMes += valorProduto;
            if (dataCliente >= inicioAno) saidasAno += valorProduto;
            
            transacoes.push({
              id: `saida-${cliente.id}`,
              cliente: cliente.nome,
              tipo: 'saida',
              valor: valorProduto,
              data: new Date(cliente.created_at || new Date()).toLocaleString('pt-BR'),
              detalheTitulo: 'Produto',
              detalheValor: produto.nome,
              isCustom: false,
            });
          }
        }
      });

      // Adicionar transações customizadas
      transacoesCustomizadas.forEach((transacao: any) => {
        const valor = parseFloat(transacao.valor);
        if (!isNaN(valor)) {
          const dataTransacao = new Date(transacao.created_at);
          if (transacao.tipo === 'entrada') {
            totalEntradas += valor;
            if (dataTransacao >= inicioMes) entradasMes += valor;
            if (dataTransacao >= inicioAno) entradasAno += valor;
          } else {
            totalSaidas += valor;
            if (dataTransacao >= inicioMes) saidasMes += valor;
            if (dataTransacao >= inicioAno) saidasAno += valor;
          }

          const linhas = transacao.descricao.split('\n');
          const cliente = linhas[0] || 'Transação customizada';
          const detalhe = linhas.slice(1).join(' ') || 'Sem detalhes';

          transacoes.push({
            id: transacao.id,
            cliente,
            tipo: transacao.tipo,
            valor,
            data: new Date(transacao.created_at).toLocaleString('pt-BR'),
            detalheTitulo: 'Customizada',
            detalheValor: detalhe,
            isCustom: true,
            descricao: transacao.descricao,
          });
        }
      });

      const lucros = totalEntradas - totalSaidas;

      setDados({
        entradas: totalEntradas,
        saidas: totalSaidas,
        lucros,
        lucrosMes: entradasMes - saidasMes,
        lucrosAno: entradasAno - saidasAno,
        transacoes: transacoes.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()),
        loading: false,
        error: null,
      });

    } catch (error) {
      console.error('❌ Erro ao carregar dados financeiros:', error);
      setDados(prev => ({
        ...prev,
        loading: false,
        error: 'Erro ao carregar dados financeiros',
      }));
    }
  };

  const salvarTransacao = async (novaTransacao: NovaTransacao) => {
    try {
      if (!userId) throw new Error('Usuário não autenticado');
      
      // Tentar inserir a transação
      let { error } = await supabase
        .from('transacoes')
        .insert({
          valor: novaTransacao.valor,
          tipo: novaTransacao.tipo,
          descricao: novaTransacao.descricao,
          user_id: userId,
        });

      // Se a tabela não existir, tentar criar automaticamente
      if (error && error.code === 'PGRST205') {
        // Tabela não encontrada, criando automaticamente
        
        try {
          // Chamar a edge function para criar a tabela
          const { data: createResult, error: createError } = await supabase.functions.invoke('create-transacoes');
          
          if (createError) {
            throw new Error(`Erro ao criar tabela: ${createError.message}`);
          }
          
          // Tentar inserir novamente
          const { error: insertError } = await supabase
            .from('transacoes')
            .insert({
              valor: novaTransacao.valor,
              tipo: novaTransacao.tipo,
              descricao: novaTransacao.descricao,
              user_id: userId,
            });

          if (insertError) {
            throw insertError;
          }
          
          // Transação salva após criar tabela
        } catch (createErr) {
          console.error('Erro ao criar tabela automaticamente:', createErr);
          throw new Error('A tabela de transações não existe e não foi possível criá-la automaticamente. Contacte o suporte.');
        }
      } else if (error) {
        throw error;
      }

      // Recarregar dados após salvar
      logPainel(`Transação ${novaTransacao.tipo} registrada: R$ ${novaTransacao.valor}`, "success");
      await carregarDadosFinanceiros();
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      throw error;
    }
  };

  const editarTransacao = async (id: string, transacaoEditada: NovaTransacao) => {
    try {
      const { error } = await supabase
        .from('transacoes')
        .update({
          valor: transacaoEditada.valor,
          tipo: transacaoEditada.tipo,
          descricao: transacaoEditada.descricao,
        })
        .eq('id', id);

      if (error) throw error;

      // Recarregar dados após editar
      await carregarDadosFinanceiros();
    } catch (error) {
      console.error('Erro ao editar transação:', error);
      throw error;
    }
  };

  const excluirTransacao = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transacoes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Recarregar dados após excluir
      await carregarDadosFinanceiros();
    } catch (error) {
      console.error('Erro ao excluir transação:', error);
      throw error;
    }
  };

  return {
    ...dados,
    salvarTransacao,
    editarTransacao,
    excluirTransacao,
  };
}
