/**
 * Sync Simple - Sincronização simples e direta usando a função principal
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req: Request) => {
  try {
    console.log('Invocando sync-artia-data...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Invocar a função principal de sincronização
    const response = await fetch(`${supabaseUrl}/functions/v1/sync-artia-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        stages: ['projects', 'activities', 'users'],
        initialSync: true,
        forceRefresh: true,
      }),
    });
    
    const result = await response.json();
    console.log('Resultado:', JSON.stringify(result, null, 2));
    
    return new Response(
      JSON.stringify(result, null, 2),
      {
        status: response.ok ? 200 : 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }, null, 2),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
