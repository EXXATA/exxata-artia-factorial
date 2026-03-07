import 'dotenv/config';
import { ArtiaDBService } from './src/infrastructure/external/ArtiaDBService.js';

const artiaDBService = new ArtiaDBService();

async function testIntegration() {
  console.log('🔍 Testando integração completa com banco MySQL do Artia...\n');

  try {
    // Teste 1: Buscar projetos
    console.log('1️⃣ Buscando projetos...');
    const projects = await artiaDBService.getUserProjects();
    console.log(`✅ ${projects.length} projetos encontrados`);
    if (projects.length > 0) {
      console.log('   Primeiros 5 projetos:');
      projects.slice(0, 5).forEach(p => {
        console.log(`   - [${p.id}] ${p.name}`);
      });
    }
    console.log('');

    // Teste 2: Buscar atividades de um projeto
    if (projects.length > 0) {
      const firstProject = projects[0];
      console.log(`2️⃣ Buscando atividades do projeto: ${firstProject.name}`);
      const activities = await artiaDBService.getProjectActivities(firstProject.id);
      console.log(`✅ ${activities.length} atividades encontradas`);
      if (activities.length > 0) {
        console.log('   Primeiras 5 atividades:');
        activities.slice(0, 5).forEach(a => {
          console.log(`   - [${a.id}] ${a.label}`);
        });
      }
      console.log('');
    }

    // Teste 3: Buscar projetos com atividades
    console.log('3️⃣ Sincronizando projetos com atividades (primeiros 3)...');
    const projectsWithActivities = await Promise.all(
      projects.slice(0, 3).map(async (project) => {
        const activities = await artiaDBService.getProjectActivities(project.id);
        return {
          ...project,
          activities
        };
      })
    );
    
    projectsWithActivities.forEach(p => {
      console.log(`   ✅ ${p.name} - ${p.activities.length} atividades`);
    });
    console.log('');

    // Teste 4: Validar estrutura de dados
    console.log('4️⃣ Validando estrutura de dados...');
    const sampleProject = projects[0];
    console.log('   Projeto exemplo:', {
      id: sampleProject.id,
      name: sampleProject.name,
      number: sampleProject.number,
      active: sampleProject.active
    });
    console.log('');

    console.log('✅ Integração MySQL funcionando perfeitamente!');
    console.log('');
    console.log('📋 Resumo:');
    console.log(`   - ${projects.length} projetos disponíveis`);
    console.log(`   - Conexão direta ao banco MySQL do Artia`);
    console.log(`   - Dados em tempo real`);
    console.log('');
    console.log('⚠️  IMPORTANTE:');
    console.log('   - Autenticação de senha NÃO está disponível via MySQL');
    console.log('   - Para login completo, use a API REST do Artia');
    console.log('   - Este método é ideal para sincronização de dados');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    const { artiaDB } = await import('./src/infrastructure/database/mysql/ArtiaDBConnection.js');
    await artiaDB.close();
    console.log('\n🔌 Conexão fechada.');
  }
}

testIntegration();
