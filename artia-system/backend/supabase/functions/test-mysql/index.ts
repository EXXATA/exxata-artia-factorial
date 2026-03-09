/**
 * Teste de Conexão MySQL - Edge Function
 * Testa conexão direta com Artia MySQL
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Client } from 'https://deno.land/x/mysql@v2.12.1/mod.ts';

serve(async (req: Request) => {
  try {
    console.log('Iniciando teste de conexão MySQL...');
    
    const config = {
      hostname: Deno.env.get('ARTIA_DB_HOST') || 'exxata.db.artia.com',
      port: parseInt(Deno.env.get('ARTIA_DB_PORT') || '3306'),
      username: Deno.env.get('ARTIA_DB_USER') || 'cliente-9115',
      password: Deno.env.get('ARTIA_DB_PASSWORD') || '',
      db: Deno.env.get('ARTIA_DB_NAME') || 'artia',
    };

    console.log('Config:', {
      hostname: config.hostname,
      port: config.port,
      username: config.username,
      db: config.db,
      hasPassword: !!config.password,
    });

    const client = await new Client().connect(config);
    console.log('Conectado ao MySQL!');

    // Testar query completa de projetos (mesma do sync-projects.ts)
    const query = `
      SELECT 
        id,
        project_number as number,
        name,
        status as active,
        created_at as createdAt
      FROM organization_9115_projects_v2 
      WHERE status = 1 AND object_type = 'project'
      ORDER BY name
      LIMIT 5
    `;
    
    console.log('Executando query:', query);
    const result = await client.query(query);
    console.log('Query executada. Registros retornados:', result.length);
    console.log('Primeiros registros:', JSON.stringify(result.slice(0, 2)));

    await client.close();

    return new Response(
      JSON.stringify({
        success: true,
        config: {
          hostname: config.hostname,
          port: config.port,
          username: config.username,
          db: config.db,
        },
        totalRecords: result.length,
        sampleRecords: result.slice(0, 3),
      }, null, 2),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro:', error);
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
