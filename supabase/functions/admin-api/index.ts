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

    switch (action) {
      case 'list_users': {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({
          page: body.page || 1,
          perPage: body.perPage || 50,
        });

        if (error) throw error;

        // Get roles for all users
        const userIds = users.map(u => u.id);
        const { data: roles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds);

        // Get client counts per user
        const { data: clientCounts } = await supabase
          .from('clientes')
          .select('user_id')
          .eq('ativo', true);

        const countMap: Record<string, number> = {};
        clientCounts?.forEach(c => {
          countMap[c.user_id] = (countMap[c.user_id] || 0) + 1;
        });

        const rolesMap: Record<string, string> = {};
        roles?.forEach(r => { rolesMap[r.user_id] = r.role; });

        const enrichedUsers = users.map(u => ({
          id: u.id,
          email: u.email,
          full_name: u.user_metadata?.full_name || '',
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          role: rolesMap[u.id] || 'user',
          clientes_count: countMap[u.id] || 0,
        }));

        return new Response(JSON.stringify({ success: true, users: enrichedUsers }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'toggle_user_ban': {
        const { target_user_id, ban } = body;
        if (!target_user_id) throw new Error('target_user_id obrigatório');

        if (ban) {
          await supabase.auth.admin.updateUserById(target_user_id, { ban_duration: '876000h' });
        } else {
          await supabase.auth.admin.updateUserById(target_user_id, { ban_duration: 'none' });
        }

        return new Response(JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'set_role': {
        const { target_user_id, role } = body;
        if (!target_user_id || !role) throw new Error('target_user_id e role obrigatórios');

        // Remove existing roles
        await supabase.from('user_roles').delete().eq('user_id', target_user_id);

        // Insert new role
        await supabase.from('user_roles').insert({ user_id: target_user_id, role });

        return new Response(JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'global_stats': {
        // Total users
        const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const totalUsers = users?.length || 0;

        // Total clients
        const { count: totalClientes } = await supabase
          .from('clientes')
          .select('*', { count: 'exact', head: true });

        // Active clients
        const { count: clientesAtivos } = await supabase
          .from('clientes')
          .select('*', { count: 'exact', head: true })
          .eq('ativo', true);

        // Total revenue (transactions)
        const { data: receitas } = await supabase
          .from('transacoes')
          .select('valor')
          .eq('tipo', 'receita');
        const totalReceita = receitas?.reduce((sum, t) => sum + Number(t.valor), 0) || 0;

        // Total charges
        const { count: totalCobrancas } = await supabase
          .from('cobrancas')
          .select('*', { count: 'exact', head: true });

        const { count: cobrancasPagas } = await supabase
          .from('cobrancas')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pago');

        return new Response(JSON.stringify({
          success: true,
          stats: {
            totalUsers,
            totalClientes: totalClientes || 0,
            clientesAtivos: clientesAtivos || 0,
            totalReceita,
            totalCobrancas: totalCobrancas || 0,
            cobrancasPagas: cobrancasPagas || 0,
          }
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      default:
        return new Response(JSON.stringify({ error: 'Ação inválida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  } catch (error: any) {
    console.error('Admin API error:', error);
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
