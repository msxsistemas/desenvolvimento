import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check admin role
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { action } = body;
    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    switch (action) {
      // ─── USERS ───────────────────────────────────────────
      case 'list_users': {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({
          page: body.page || 1,
          perPage: body.perPage || 50,
        });
        if (error) throw error;

        const userIds = users.map(u => u.id);
        const { data: roles } = await supabase.from('user_roles').select('user_id, role').in('user_id', userIds);
        const { data: clientCounts } = await supabase.from('clientes').select('user_id');

        const countMap: Record<string, number> = {};
        clientCounts?.forEach(c => { countMap[c.user_id] = (countMap[c.user_id] || 0) + 1; });
        const rolesMap: Record<string, string> = {};
        roles?.forEach(r => { rolesMap[r.user_id] = r.role; });

        const enrichedUsers = users.map(u => ({
          id: u.id, email: u.email, full_name: u.user_metadata?.full_name || '',
          created_at: u.created_at, last_sign_in_at: u.last_sign_in_at,
          role: rolesMap[u.id] || 'user', clientes_count: countMap[u.id] || 0,
        }));
        return json({ success: true, users: enrichedUsers });
      }

      case 'toggle_user_ban': {
        const { target_user_id, ban } = body;
        if (!target_user_id) throw new Error('target_user_id obrigatório');
        if (ban) {
          await supabase.auth.admin.updateUserById(target_user_id, { ban_duration: '876000h' });
        } else {
          await supabase.auth.admin.updateUserById(target_user_id, { ban_duration: 'none' });
        }
        return json({ success: true });
      }

      case 'set_role': {
        const { target_user_id, role } = body;
        if (!target_user_id || !role) throw new Error('target_user_id e role obrigatórios');
        await supabase.from('user_roles').delete().eq('user_id', target_user_id);
        await supabase.from('user_roles').insert({ user_id: target_user_id, role });
        return json({ success: true });
      }

      // ─── GLOBAL STATS ───────────────────────────────────
      case 'global_stats': {
        const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const allUsers = users || [];
        const totalUsers = allUsers.length;

        // All clients
        const { data: allClientes } = await supabase.from('clientes').select('id, nome, data_vencimento, plano, created_at, user_id, ativo');
        const clientes = allClientes || [];
        const totalClientes = clientes.length;

        // Active/expired based on data_vencimento
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        let clientesAtivos = 0;
        let clientesVencidos = 0;
        
        clientes.forEach(c => {
          if (!c.data_vencimento) { clientesAtivos++; return; }
          const dv = new Date(c.data_vencimento);
          if (dv >= now) clientesAtivos++;
          else clientesVencidos++;
        });

        // Financial - transacoes
        const { data: transacoes } = await supabase.from('transacoes').select('valor, tipo, created_at');
        let totalEntradas = 0;
        let totalSaidas = 0;
        (transacoes || []).forEach(t => {
          const v = Number(t.valor);
          if (t.tipo === 'entrada') totalEntradas += v;
          else totalSaidas += v;
        });

        // Cobranças
        const { count: totalCobrancas } = await supabase.from('cobrancas').select('*', { count: 'exact', head: true });
        const { count: cobrancasPagas } = await supabase.from('cobrancas').select('*', { count: 'exact', head: true }).eq('status', 'pago');

        // Subscriptions
        const { data: subs } = await supabase.from('user_subscriptions').select('status, expira_em, plan_id, created_at');
        const subsAtivas = (subs || []).filter(s => s.status === 'active' || s.status === 'ativa').length;
        const subsPendentes = (subs || []).filter(s => s.status === 'pending' || s.status === 'pendente').length;
        const subsExpiradas = (subs || []).filter(s => s.status === 'expired' || s.status === 'expirada').length;

        // Subscription revenue (from system_plans)
        const { data: plans } = await supabase.from('system_plans').select('id, valor');
        const planValorMap: Record<string, number> = {};
        (plans || []).forEach(p => { planValorMap[p.id] = Number(p.valor); });

        const nowDate = new Date();
        const inicioMesAtual = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
        const inicioAno = new Date(nowDate.getFullYear(), 0, 1);

        let receitaMensal = 0;
        let receitaAnual = 0;
        (subs || []).forEach(s => {
          if (s.status !== 'active' && s.status !== 'ativa') return;
          const valor = s.plan_id ? (planValorMap[s.plan_id] || 0) : 0;
          const createdAt = new Date(s.created_at);
          if (createdAt >= inicioMesAtual) receitaMensal += valor;
          if (createdAt >= inicioAno) receitaAnual += valor;
        });

        // Also count active subs as monthly recurring
        let receitaRecorrente = 0;
        (subs || []).forEach(s => {
          if (s.status !== 'active' && s.status !== 'ativa') return;
          receitaRecorrente += s.plan_id ? (planValorMap[s.plan_id] || 0) : 0;
        });

        // New users this month/week/today
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        const inicioSemana = new Date(hoje); inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

        let novosUsersHoje = 0, novosUsersSemana = 0, novosUsersMes = 0;
        allUsers.forEach(u => {
          const d = new Date(u.created_at); d.setHours(0, 0, 0, 0);
          if (d.getTime() === hoje.getTime()) novosUsersHoje++;
          if (d >= inicioSemana) novosUsersSemana++;
          if (d >= inicioMes) novosUsersMes++;
        });

        // New clients this month/week/today
        let novosClientesHoje = 0, novosClientesSemana = 0, novosClientesMes = 0;
        let clientesVencendoHoje = 0, clientesVencendo3Dias = 0;
        const tresDias = new Date(hoje); tresDias.setDate(tresDias.getDate() + 3);
        
        clientes.forEach(c => {
          const dc = new Date(c.created_at || ''); dc.setHours(0, 0, 0, 0);
          if (dc.getTime() === hoje.getTime()) novosClientesHoje++;
          if (dc >= inicioSemana) novosClientesSemana++;
          if (dc >= inicioMes) novosClientesMes++;
          
          if (c.data_vencimento) {
            const dv = new Date(c.data_vencimento); dv.setHours(0, 0, 0, 0);
            if (dv.getTime() === hoje.getTime()) clientesVencendoHoje++;
            if (dv > hoje && dv <= tresDias) clientesVencendo3Dias++;
          }
        });

        // Users growth last 7 days
        const usersGrowth = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
          const count = allUsers.filter(u => {
            const uc = new Date(u.created_at); uc.setHours(0, 0, 0, 0);
            return uc.getTime() === d.getTime();
          }).length;
          usersGrowth.push({ day: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}`, total: count });
        }

        // Clients growth last 7 days
        const clientesGrowth = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
          const count = clientes.filter(c => {
            const cc = new Date(c.created_at || ''); cc.setHours(0, 0, 0, 0);
            return cc.getTime() === d.getTime();
          }).length;
          clientesGrowth.push({ day: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}`, total: count });
        }

        // Recent users (last 10)
        const recentUsers = allUsers
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10)
          .map(u => ({
            id: u.id, email: u.email, created_at: u.created_at,
            full_name: u.user_metadata?.full_name || '',
          }));

        return json({
          success: true,
          stats: {
            totalUsers, totalClientes, clientesAtivos, clientesVencidos,
            totalEntradas, totalSaidas, lucro: totalEntradas - totalSaidas,
            totalCobrancas: totalCobrancas || 0, cobrancasPagas: cobrancasPagas || 0,
            subsAtivas, subsPendentes, subsExpiradas,
            receitaMensal, receitaAnual, receitaRecorrente,
            novosUsersHoje, novosUsersSemana, novosUsersMes,
            novosClientesHoje, novosClientesSemana, novosClientesMes,
            clientesVencendoHoje, clientesVencendo3Dias,
            usersGrowth, clientesGrowth, recentUsers,
          }
        });
      }

      // ─── MENSAGENS PADRÕES (all users) ──────────────────
      case 'list_mensagens_padroes': {
        const { data: { users: allUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const emailMap: Record<string, string> = {};
        allUsers?.forEach(u => { emailMap[u.id] = u.email || ''; });

        const { data } = await supabase.from('mensagens_padroes').select('*').order('updated_at', { ascending: false });
        const msgs = (data || []).map(m => ({ ...m, owner_email: emailMap[m.user_id] || '—' }));
        return json({ success: true, mensagens: msgs });
      }

      case 'update_mensagem_padrao': {
        const { mensagem_id, updates } = body;
        if (!mensagem_id) throw new Error('mensagem_id obrigatório');
        const { error } = await supabase.from('mensagens_padroes').update(updates).eq('id', mensagem_id);
        if (error) throw error;
        return json({ success: true });
      }

      // ─── PLANOS SaaS ────────────────────────────────────
      case 'list_planos': {
        const { data: { users: allUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const emailMap: Record<string, string> = {};
        allUsers?.forEach(u => { emailMap[u.id] = u.email || ''; });

        const { data } = await supabase.from('planos').select('*').order('created_at', { ascending: false });
        const planos = (data || []).map(p => ({ ...p, owner_email: emailMap[p.user_id] || '—' }));
        return json({ success: true, planos });
      }

      case 'update_plano': {
        const { plano_id, updates } = body;
        if (!plano_id) throw new Error('plano_id obrigatório');
        const { error } = await supabase.from('planos').update(updates).eq('id', plano_id);
        if (error) throw error;
        return json({ success: true });
      }

      case 'delete_plano': {
        const { plano_id } = body;
        if (!plano_id) throw new Error('plano_id obrigatório');
        const { error } = await supabase.from('planos').delete().eq('id', plano_id);
        if (error) throw error;
        return json({ success: true });
      }

      // ─── GATEWAYS (all users) ───────────────────────────
      case 'list_gateways': {
        const { data: { users: allUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const emailMap: Record<string, string> = {};
        allUsers?.forEach(u => { emailMap[u.id] = u.email || ''; });

        const [asaas, mp, ciabra, v3pay, checkout] = await Promise.all([
          supabase.from('asaas_config').select('id, user_id, is_configured, created_at'),
          supabase.from('mercadopago_config').select('id, user_id, is_configured, created_at'),
          supabase.from('ciabra_config').select('id, user_id, is_configured, created_at'),
          supabase.from('v3pay_config').select('id, user_id, is_configured, created_at'),
          supabase.from('checkout_config').select('id, user_id, gateway_ativo, pix_enabled, credit_card_enabled, pix_manual_enabled, created_at'),
        ]);

        const mapGw = (data: any[], gateway: string) =>
          (data || []).map(g => ({ ...g, gateway, owner_email: emailMap[g.user_id] || '—' }));

        return json({
          success: true,
          gateways: {
            asaas: mapGw(asaas.data, 'Asaas'),
            mercadopago: mapGw(mp.data, 'Mercado Pago'),
            ciabra: mapGw(ciabra.data, 'Ciabra'),
            v3pay: mapGw(v3pay.data, 'V3Pay'),
            checkout: mapGw(checkout.data, 'Checkout'),
          }
        });
      }

      // ─── LOGS (all users) ──────────────────────────────
      case 'list_logs': {
        const { data: { users: allUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const emailMap: Record<string, string> = {};
        allUsers?.forEach(u => { emailMap[u.id] = u.email || ''; });

        const tipo = body.tipo || 'painel';
        const table = tipo === 'sistema' ? 'logs_sistema' : 'logs_painel';
        const { data } = await supabase.from(table).select('*').order('created_at', { ascending: false }).limit(200);
        const logs = (data || []).map(l => ({ ...l, owner_email: emailMap[l.user_id] || '—' }));
        return json({ success: true, logs });
      }

      // ─── WHATSAPP SESSIONS (all users) ──────────────────
      case 'list_whatsapp_sessions': {
        const { data: { users: allUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const emailMap: Record<string, string> = {};
        allUsers?.forEach(u => { emailMap[u.id] = u.email || ''; });

        const { data } = await supabase.from('whatsapp_sessions').select('id, session_id, user_id, status, phone_number, device_name, last_activity, created_at').order('created_at', { ascending: false });
        const sessions = (data || []).map(s => ({ ...s, owner_email: emailMap[s.user_id] || '—' }));
        return json({ success: true, sessions });
      }

      // ─── TRANSAÇÕES (all users) ─────────────────────────
      case 'list_transacoes': {
        const { data: { users: allUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const emailMap: Record<string, string> = {};
        allUsers?.forEach(u => { emailMap[u.id] = u.email || ''; });

        const { data } = await supabase.from('transacoes').select('*').order('created_at', { ascending: false }).limit(200);
        const transacoes = (data || []).map(t => ({ ...t, owner_email: emailMap[t.user_id] || '—' }));
        return json({ success: true, transacoes });
      }

      default:
        return json({ error: 'Ação inválida' }, 400);
    }
  } catch (error: any) {
    console.error('Admin API error:', error);
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
