/**
 * Script de População Completa - Artia para Supabase
 * Popula projetos, atividades e usuários diretamente do MySQL e Factorial
 */

require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');

// Configurações
const MYSQL_CONFIG = {
  host: process.env.ARTIA_DB_HOST,
  port: parseInt(process.env.ARTIA_DB_PORT || '3306'),
  user: process.env.ARTIA_DB_USER,
  password: process.env.ARTIA_DB_PASSWORD,
  database: process.env.ARTIA_DB_NAME,
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FACTORIAL_API_KEY = process.env.FACTORIAL_API_KEY;

const BATCH_SIZE = 100;

// Cores para console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeProjectNumber(number, id) {
  const normalized = String(number || '').trim();
  return normalized || `SEM-NUMERO-${id}`;
}

async function populateProjects(mysqlConn, supabase) {
  logSection('POPULANDO PROJETOS');
  
  try {
    // Buscar projetos do MySQL
    log('📊 Buscando projetos do MySQL...', 'yellow');
    const [projects] = await mysqlConn.query(`
      SELECT 
        id,
        project_number as number,
        name,
        status as active,
        created_at as createdAt
      FROM organization_9115_projects_v2 
      WHERE object_type = 'project'
      ORDER BY name
    `);
    
    log(`✅ Encontrados ${projects.length} projetos`, 'green');
    
    // Preparar dados - garantir number único usando ID se houver duplicatas
    const numberCount = new Map();
    const projectsToInsert = projects.map(p => {
      const baseNumber = normalizeProjectNumber(p.number, p.id);
      let uniqueNumber = baseNumber;
      
      // Se o number já existe, adicionar sufixo com ID
      if (numberCount.has(baseNumber)) {
        uniqueNumber = `${baseNumber}-${p.id}`;
      }
      numberCount.set(baseNumber, (numberCount.get(baseNumber) || 0) + 1);
      
      return {
        project_id: String(p.id),
        number: uniqueNumber,
        name: p.name,
        active: p.active === 1,
        source: 'artia_mysql',
        sync_scope_key: 'artia',
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });
    
    // Inserir em lotes
    log(`📤 Inserindo ${projectsToInsert.length} projetos em lotes de ${BATCH_SIZE}...`, 'yellow');
    let inserted = 0;
    
    for (let i = 0; i < projectsToInsert.length; i += BATCH_SIZE) {
      const batch = projectsToInsert.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from('projects')
        .upsert(batch, { onConflict: 'project_id', ignoreDuplicates: false });
      
      if (error) {
        throw new Error(`Erro ao inserir batch: ${error.message}`);
      }
      
      inserted += batch.length;
      log(`  ✅ Batch ${Math.floor(i/BATCH_SIZE) + 1}: ${inserted}/${projectsToInsert.length} projetos`, 'green');
    }
    
    log(`✅ PROJETOS CONCLUÍDO: ${inserted} inseridos`, 'bright');
    return { total: projects.length, inserted };
    
  } catch (error) {
    log(`❌ ERRO ao popular projetos: ${error.message}`, 'red');
    throw error;
  }
}

async function populateActivities(mysqlConn, supabase) {
  logSection('POPULANDO ATIVIDADES');
  
  try {
    // Buscar atividades do MySQL
    log('📊 Buscando atividades do MySQL...', 'yellow');
    const [activities] = await mysqlConn.query(`
      SELECT 
        id,
        parent_id as projectId,
        title as label,
        activity_status as active
      FROM organization_9115_activities_v2 
      WHERE status = 1
      ORDER BY parent_id, title
    `);
    
    log(`✅ Encontradas ${activities.length} atividades`, 'green');
    
    // Buscar mapeamento de project_id (Artia ID -> Supabase UUID)
    log('🔍 Buscando mapeamento de projetos...', 'yellow');
    const { data: supabaseProjects, error: projectsError } = await supabase
      .from('projects')
      .select('id, project_id')
      .eq('source', 'artia_mysql');
    
    if (projectsError) {
      throw new Error(`Erro ao buscar projetos: ${projectsError.message}`);
    }
    
    const existingProjectIds = new Set(
      supabaseProjects.map((p) => String(p.project_id))
    );
    
    log(`✅ Projetos válidos para FK: ${existingProjectIds.size}`, 'green');
    
    // A FK de activities.project_id referencia projects.project_id (TEXT), não o UUID interno
    const activitiesToInsert = activities
      .filter((activity, index) => {
        const projectId = String(activity.projectId);
        const hasProject = existingProjectIds.has(projectId);
        if (!hasProject && index < 5) {
          log(`  ⚠️  Atividade ${activity.id} sem projeto válido (projectId: ${projectId})`, 'yellow');
        }
        return hasProject;
      })
      .map((activity) => ({
        activity_id: String(activity.id),
        project_id: String(activity.projectId),
        label: activity.label,
        artia_id: String(activity.id),
        active: activity.active === 1,
        source: 'artia_mysql',
        sync_scope_key: 'artia',
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    
    log(`📊 Atividades válidas (com projeto): ${activitiesToInsert.length}`, 'blue');
    
    // Inserir em lotes
    log(`📤 Inserindo ${activitiesToInsert.length} atividades em lotes de ${BATCH_SIZE}...`, 'yellow');
    let inserted = 0;
    
    for (let i = 0; i < activitiesToInsert.length; i += BATCH_SIZE) {
      const batch = activitiesToInsert.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from('activities')
        .upsert(batch, { onConflict: 'activity_id', ignoreDuplicates: false });
      
      if (error) {
        throw new Error(`Erro ao inserir batch: ${error.message}`);
      }
      
      inserted += batch.length;
      log(`  ✅ Batch ${Math.floor(i/BATCH_SIZE) + 1}: ${inserted}/${activitiesToInsert.length} atividades`, 'green');
    }
    
    log(`✅ ATIVIDADES CONCLUÍDO: ${inserted} inseridas`, 'bright');
    return { total: activities.length, valid: activitiesToInsert.length, inserted };
    
  } catch (error) {
    log(`❌ ERRO ao popular atividades: ${error.message}`, 'red');
    throw error;
  }
}

async function populateUsers(mysqlConn, supabase) {
  logSection('POPULANDO USUÁRIOS');
  
  try {
    // 1. Buscar todos os employees do Factorial com paginação real
    log('📡 Buscando employees ativos do Factorial...', 'yellow');
    const factorialEmployees = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const response = await fetch(`https://api.factorialhr.com/api/2026-01-01/resources/employees/employees?page=${page}`, {
        headers: {
          'x-api-key': FACTORIAL_API_KEY,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Factorial API error: ${response.status} - ${await response.text()}`);
      }

      const payload = await response.json();
      const pageEmployees = Array.isArray(payload?.data) ? payload.data : [];
      const meta = payload?.meta || {};

      factorialEmployees.push(...pageEmployees);
      log(`  ✅ Página ${page}: ${pageEmployees.length} registros (acumulado: ${factorialEmployees.length})`, 'green');

      hasNextPage = Boolean(meta.has_next_page);
      page += 1;
    }

    const activeFactorialEmployees = factorialEmployees.filter((employee) => {
      if (typeof employee.active === 'boolean') {
        return employee.active;
      }
      return !employee.terminated_on;
    });

    log(`✅ Factorial retornou ${factorialEmployees.length} employees (${activeFactorialEmployees.length} ativos)`, 'green');

    // 2. Buscar usuários ativos do Artia MySQL
    log('📡 Buscando usuários ativos do Artia MySQL...', 'yellow');
    const [artiaUsers] = await mysqlConn.query(`
      SELECT 
        id,
        email,
        name,
        organization_user_state
      FROM organization_9115_organization_users_v2 
      WHERE organization_user_state = 'Ativo'
        AND email IS NOT NULL
        AND email <> ''
      ORDER BY name
    `);
    
    log(`✅ Artia MySQL retornou ${artiaUsers.length} usuários ativos`, 'green');
    
    // 3. Merge profissional: união de Factorial + Artia por email
    log('🔄 Fazendo merge por email...', 'yellow');
    const artiaByEmail = new Map(
      artiaUsers.map((user) => [normalizeEmail(user.email), user])
    );
    const factorialByEmail = new Map(
      activeFactorialEmployees
        .filter((employee) => normalizeEmail(employee.email || employee.login_email))
        .map((employee) => [normalizeEmail(employee.email || employee.login_email), employee])
    );

    const allEmails = new Set([
      ...artiaByEmail.keys(),
      ...factorialByEmail.keys(),
    ]);

    const usersToInsert = Array.from(allEmails).map((email) => {
      const artiaUser = artiaByEmail.get(email);
      const factorialEmployee = factorialByEmail.get(email);

      return {
        email: factorialEmployee?.email || factorialEmployee?.login_email || artiaUser?.email,
        name: artiaUser?.name || factorialEmployee?.full_name || `${factorialEmployee?.first_name || ''} ${factorialEmployee?.last_name || ''}`.trim(),
        factorial_employee_id: factorialEmployee ? String(factorialEmployee.id) : null,
        artia_user_id: artiaUser ? String(artiaUser.id) : null,
        updated_at: new Date().toISOString(),
      };
    });
    
    log(`📊 Total de usuários a inserir: ${usersToInsert.length}`, 'blue');
    log(`   - Com Artia ID: ${usersToInsert.filter((user) => user.artia_user_id).length}`, 'blue');
    log(`   - Com Factorial ID: ${usersToInsert.filter((user) => user.factorial_employee_id).length}`, 'blue');
    log(`   - Integrados nas duas fontes: ${usersToInsert.filter((user) => user.artia_user_id && user.factorial_employee_id).length}`, 'blue');
    
    // 4. Inserir em lotes
    log(`📤 Inserindo ${usersToInsert.length} usuários em lotes de 50...`, 'yellow');
    let inserted = 0;
    
    for (let i = 0; i < usersToInsert.length; i += 50) {
      const batch = usersToInsert.slice(i, i + 50);
      
      const { error } = await supabase
        .from('users')
        .upsert(batch, { onConflict: 'email' });
      
      if (error) {
        throw new Error(`Erro ao inserir batch: ${error.message}`);
      }
      
      inserted += batch.length;
      log(`  ✅ Batch ${Math.floor(i/50) + 1}: ${inserted}/${usersToInsert.length} usuários`, 'green');
    }
    
    log(`✅ USUÁRIOS CONCLUÍDO: ${inserted} inseridos`, 'bright');
    return { factorial: activeFactorialEmployees.length, artia: artiaUsers.length, inserted };
    
  } catch (error) {
    log(`❌ ERRO ao popular usuários: ${error.message}`, 'red');
    throw error;
  }
}

async function main() {
  const startTime = Date.now();
  
  logSection('POPULAÇÃO COMPLETA - ARTIA → SUPABASE');
  log(`Início: ${new Date().toLocaleString('pt-BR')}`, 'blue');
  
  let mysqlConn;
  
  try {
    // Validar configurações
    if (!MYSQL_CONFIG.host || !SUPABASE_URL || !FACTORIAL_API_KEY) {
      throw new Error('Variáveis de ambiente faltando! Verifique o arquivo .env');
    }
    
    // Conectar MySQL
    log('\n🔌 Conectando ao MySQL...', 'yellow');
    mysqlConn = await mysql.createConnection(MYSQL_CONFIG);
    log('✅ MySQL conectado!', 'green');
    
    // Conectar Supabase
    log('🔌 Conectando ao Supabase...', 'yellow');
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    log('✅ Supabase conectado!', 'green');
    
    // Resultados
    const results = {
      projects: null,
      activities: null,
      users: null,
    };
    
    // 1. Popular Projetos
    results.projects = await populateProjects(mysqlConn, supabase);
    
    // 2. Popular Atividades
    results.activities = await populateActivities(mysqlConn, supabase);
    
    // 3. Popular Usuários
    results.users = await populateUsers(mysqlConn, supabase);
    
    // Resumo Final
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    logSection('POPULAÇÃO COMPLETA - SUCESSO!');
    log(`⏱️  Duração: ${duration}s`, 'bright');
    log(`\n📊 PROJETOS:`, 'cyan');
    log(`   Total MySQL: ${results.projects.total}`, 'blue');
    log(`   Inseridos: ${results.projects.inserted}`, 'green');
    log(`\n📊 ATIVIDADES:`, 'cyan');
    log(`   Total MySQL: ${results.activities.total}`, 'blue');
    log(`   Válidas: ${results.activities.valid}`, 'blue');
    log(`   Inseridas: ${results.activities.inserted}`, 'green');
    log(`\n📊 USUÁRIOS:`, 'cyan');
    log(`   Factorial: ${results.users.factorial}`, 'blue');
    log(`   Artia: ${results.users.artia}`, 'blue');
    log(`   Inseridos: ${results.users.inserted}`, 'green');
    
    console.log('\n' + '='.repeat(60) + '\n');
    
  } catch (error) {
    log(`\n❌ ERRO FATAL: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    if (mysqlConn) {
      await mysqlConn.end();
      log('🔌 Conexão MySQL fechada', 'blue');
    }
  }
}

// Executar
main();
