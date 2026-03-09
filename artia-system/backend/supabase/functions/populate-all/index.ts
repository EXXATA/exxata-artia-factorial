/**
 * Populate All - População completa e profissional de TODOS os dados
 * Projetos, Atividades e Usuários do Artia MySQL + Factorial
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Client } from 'https://deno.land/x/mysql@v2.12.1/mod.ts';

serve(async (req: Request) => {
  const startTime = Date.now();
  
  try {
    console.log('========================================');
    console.log('POPULAÇÃO COMPLETA - INÍCIO');
    console.log('========================================');
    
    // Conectar MySQL
    const mysqlClient = await new Client().connect({
      hostname: Deno.env.get('ARTIA_DB_HOST')!,
      port: parseInt(Deno.env.get('ARTIA_DB_PORT') || '3306'),
      username: Deno.env.get('ARTIA_DB_USER')!,
      password: Deno.env.get('ARTIA_DB_PASSWORD')!,
      db: Deno.env.get('ARTIA_DB_NAME')!,
    });
    console.log('✅ MySQL conectado');
    
    // Conectar Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    console.log('✅ Supabase conectado');
    
    const results = {
      projects: { total: 0, inserted: 0 },
      activities: { total: 0, inserted: 0 },
      users: { total: 0, inserted: 0 },
    };
    
    // ========== 1. PROJETOS ==========
    console.log('\n========== SINCRONIZANDO PROJETOS ==========');
    const projectsQuery = `
      SELECT 
        id,
        project_number as number,
        name,
        status as active,
        created_at as createdAt
      FROM organization_9115_projects_v2 
      WHERE object_type = 'project'
      ORDER BY name
    `;
    
    const projects = await mysqlClient.query(projectsQuery);
    results.projects.total = projects.length;
    console.log(`📊 Total de projetos no MySQL: ${projects.length}`);
    
    const projectsToInsert = projects.map((p: any) => ({
      project_id: String(p.id),
      number: String(p.number || '').trim() || `SEM-NUMERO-${p.id}`,
      name: p.name,
      active: p.active === 1,
      source: 'artia_mysql',
      sync_scope_key: 'artia',
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    
    // Inserir em lotes de 100
    const batchSize = 100;
    for (let i = 0; i < projectsToInsert.length; i += batchSize) {
      const batch = projectsToInsert.slice(i, i + batchSize);
      const { error } = await supabase.from('projects').upsert(batch, { onConflict: 'project_id' });
      
      if (error) throw new Error(`Erro ao inserir projetos: ${error.message}`);
      
      results.projects.inserted += batch.length;
      console.log(`  ✅ Batch ${Math.floor(i/batchSize) + 1}: ${results.projects.inserted}/${projects.length} projetos`);
    }
    console.log(`✅ PROJETOS CONCLUÍDO: ${results.projects.inserted} inseridos`);
    
    // ========== 2. ATIVIDADES ==========
    console.log('\n========== SINCRONIZANDO ATIVIDADES ==========');
    const activitiesQuery = `
      SELECT 
        id, parent_id as projectId, title as label, activity_status as active
      FROM organization_9115_activities_v2 
      WHERE status = 1
      ORDER BY parent_id, title
    `;
    
    const activities = await mysqlClient.query(activitiesQuery);
    results.activities.total = activities.length;
    console.log(`📊 Total de atividades no MySQL: ${activities.length}`);
    
    // Criar mapa de project_id (MySQL) para project_id (Supabase)
    const { data: supabaseProjects } = await supabase
      .from('projects')
      .select('id, project_id');
    
    const projectIdMap = new Map(
      supabaseProjects?.map((p: any) => [p.project_id, p.id]) || []
    );
    
    const activitiesToInsert = activities
      .filter((a: any) => projectIdMap.has(String(a.projectId)))
      .map((a: any) => ({
        activity_id: String(a.id),
        project_id: projectIdMap.get(String(a.projectId)),
        label: a.label,
        artia_id: String(a.id),
        active: a.active === 1,
        source: 'artia_mysql',
        sync_scope_key: 'artia',
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    
    console.log(`📊 Atividades válidas (com projeto): ${activitiesToInsert.length}`);
    
    // Inserir em lotes de 100
    for (let i = 0; i < activitiesToInsert.length; i += batchSize) {
      const batch = activitiesToInsert.slice(i, i + batchSize);
      const { error } = await supabase.from('activities').upsert(batch, { onConflict: 'activity_id' });
      
      if (error) throw new Error(`Erro ao inserir atividades: ${error.message}`);
      
      results.activities.inserted += batch.length;
      console.log(`  ✅ Batch ${Math.floor(i/batchSize) + 1}: ${results.activities.inserted}/${activitiesToInsert.length} atividades`);
    }
    console.log(`✅ ATIVIDADES CONCLUÍDO: ${results.activities.inserted} inseridas`);
    
    // ========== 3. USUÁRIOS ==========
    console.log('\n========== SINCRONIZANDO USUÁRIOS ==========');
    
    // 3.1 Factorial
    console.log('📡 Buscando usuários do Factorial...');
    const factorialResponse = await fetch('https://api.factorialhr.com/api/v1/core/employees', {
      headers: {
        'Authorization': `Bearer ${Deno.env.get('FACTORIAL_API_KEY')}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!factorialResponse.ok) {
      throw new Error(`Factorial API error: ${factorialResponse.status}`);
    }
    
    const factorialEmployees = await factorialResponse.json();
    console.log(`📊 Factorial retornou ${factorialEmployees.length} employees`);
    
    // 3.2 Artia MySQL
    console.log('📡 Buscando usuários do Artia MySQL...');
    const artiaUsersQuery = `
      SELECT id, user_email as email, user_name as name
      FROM organization_9115_organization_users_v2 
      WHERE status = 1
      ORDER BY user_name
    `;
    
    const artiaUsers = await mysqlClient.query(artiaUsersQuery);
    console.log(`📊 Artia MySQL retornou ${artiaUsers.length} usuários`);
    
    // 3.3 Merge
    const artiaByEmail = new Map(artiaUsers.map((u: any) => [u.email.toLowerCase(), u]));
    
    const usersToInsert = factorialEmployees.map((emp: any) => {
      const artiaUser = artiaByEmail.get(emp.email.toLowerCase());
      return {
        email: emp.email,
        name: artiaUser?.name || `${emp.first_name} ${emp.last_name}`,
        factorial_employee_id: String(emp.id),
        artia_user_id: artiaUser ? String(artiaUser.id) : null,
        updated_at: new Date().toISOString(),
      };
    });
    
    results.users.total = usersToInsert.length;
    console.log(`📊 Total de usuários a inserir: ${usersToInsert.length}`);
    
    // Inserir em lotes de 50
    for (let i = 0; i < usersToInsert.length; i += 50) {
      const batch = usersToInsert.slice(i, i + 50);
      const { error } = await supabase.from('users').upsert(batch, { onConflict: 'email' });
      
      if (error) throw new Error(`Erro ao inserir usuários: ${error.message}`);
      
      results.users.inserted += batch.length;
      console.log(`  ✅ Batch ${Math.floor(i/50) + 1}: ${results.users.inserted}/${usersToInsert.length} usuários`);
    }
    console.log(`✅ USUÁRIOS CONCLUÍDO: ${results.users.inserted} inseridos`);
    
    await mysqlClient.close();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n========================================');
    console.log('POPULAÇÃO COMPLETA - SUCESSO!');
    console.log('========================================');
    console.log(`⏱️  Duração: ${duration}s`);
    console.log(`📊 Projetos: ${results.projects.inserted}/${results.projects.total}`);
    console.log(`📊 Atividades: ${results.activities.inserted}/${results.activities.total}`);
    console.log(`📊 Usuários: ${results.users.inserted}/${results.users.total}`);
    console.log('========================================');
    
    return new Response(
      JSON.stringify({
        success: true,
        duration_seconds: parseFloat(duration),
        results,
      }, null, 2),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('❌ ERRO:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
      }, null, 2),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
