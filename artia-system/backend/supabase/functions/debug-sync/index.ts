/**
 * Debug Sync - Função simplificada para testar sincronização passo a passo
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Client } from 'https://deno.land/x/mysql@v2.12.1/mod.ts';

serve(async (req: Request) => {
  try {
    console.log('=== DEBUG SYNC - INÍCIO ===');
    
    // 1. Conectar MySQL
    console.log('1. Conectando ao MySQL...');
    const mysqlConfig = {
      hostname: Deno.env.get('ARTIA_DB_HOST') || 'exxata.db.artia.com',
      port: parseInt(Deno.env.get('ARTIA_DB_PORT') || '3306'),
      username: Deno.env.get('ARTIA_DB_USER') || 'cliente-9115',
      password: Deno.env.get('ARTIA_DB_PASSWORD') || '',
      db: Deno.env.get('ARTIA_DB_NAME') || 'artia',
    };
    
    const mysqlClient = await new Client().connect(mysqlConfig);
    console.log('✅ MySQL conectado!');
    
    // 2. Buscar projetos do MySQL (LIMIT fixo de 50)
    console.log('2. Buscando projetos do MySQL (LIMIT 50)...');
    const projectsQuery = `
      SELECT 
        id,
        project_number as number,
        name,
        status as active,
        created_at as createdAt
      FROM organization_9115_projects_v2 
      WHERE status = 1 AND object_type = 'project'
      ORDER BY name
      LIMIT 50
    `;
    
    const projects = await mysqlClient.query(projectsQuery);
    console.log(`✅ MySQL retornou ${projects.length} projetos`);
    console.log('Primeiros 3:', JSON.stringify(projects.slice(0, 3), null, 2));
    
    // 3. Conectar Supabase
    console.log('3. Conectando ao Supabase...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase conectado!');
    
    // 4. Inserir projetos no Supabase em lotes
    console.log('4. Inserindo projetos no Supabase em lotes...');
    const projectsToInsert = projects.map((p: any) => ({
      project_id: String(p.id),
      number: p.number,
      name: p.name,
      active: p.active === 1,
      source: 'artia_mysql',
      sync_scope_key: 'artia',
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    
    console.log(`Total a inserir: ${projectsToInsert.length} projetos`);
    
    const batchSize = 50;
    let totalInserted = 0;
    
    for (let i = 0; i < projectsToInsert.length; i += batchSize) {
      const batch = projectsToInsert.slice(i, i + batchSize);
      console.log(`Inserindo batch ${Math.floor(i/batchSize) + 1}: ${batch.length} projetos`);
      
      const { data, error } = await supabase
        .from('projects')
        .upsert(batch, {
          onConflict: 'project_id',
          ignoreDuplicates: false,
        })
        .select();
      
      if (error) {
        console.error(`❌ Erro no batch ${Math.floor(i/batchSize) + 1}:`, error);
        throw error;
      }
      
      totalInserted += batch.length;
      console.log(`✅ Batch ${Math.floor(i/batchSize) + 1} inserido! Total: ${totalInserted}/${projectsToInsert.length}`);
    }
    
    console.log(`✅ TODOS os ${totalInserted} projetos inseridos com sucesso!`);
    
    // 5. Verificar no banco
    console.log('5. Verificando projetos no banco...');
    const { data: checkData, error: checkError } = await supabase
      .from('projects')
      .select('project_id, number, name, source')
      .limit(5);
    
    if (checkError) {
      console.error('❌ Erro ao verificar:', checkError);
    } else {
      console.log(`✅ Encontrados ${checkData?.length || 0} projetos no banco`);
      console.log('Projetos:', JSON.stringify(checkData, null, 2));
    }
    
    await mysqlClient.close();
    
    return new Response(
      JSON.stringify({
        success: true,
        mysqlProjects: projects.length,
        insertedProjects: projectsToInsert.length,
        verifiedProjects: checkData?.length || 0,
        sampleProjects: checkData,
      }, null, 2),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('❌ ERRO:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
      }, null, 2),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
