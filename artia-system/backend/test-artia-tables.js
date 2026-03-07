import 'dotenv/config';
import { artiaDB } from './src/infrastructure/database/mysql/ArtiaDBConnection.js';

async function testArtiaTables() {
  console.log('🔍 Verificando estrutura das tabelas do Artia...\n');

  try {
    await artiaDB.connect();

    // Verificar tabela de usuários
    console.log('1️⃣ Estrutura: organization_9115_organization_users_v2');
    const usersStructure = await artiaDB.query('DESCRIBE organization_9115_organization_users_v2');
    console.log('Colunas:');
    usersStructure.forEach(col => {
      console.log(`   - ${col.Field} (${col.Type})`);
    });
    console.log('');

    // Verificar tabela de projetos
    console.log('2️⃣ Estrutura: organization_9115_projects_v2');
    const projectsStructure = await artiaDB.query('DESCRIBE organization_9115_projects_v2');
    console.log('Colunas:');
    projectsStructure.forEach(col => {
      console.log(`   - ${col.Field} (${col.Type})`);
    });
    console.log('');

    // Verificar tabela de atividades
    console.log('3️⃣ Estrutura: organization_9115_activities_v2');
    const activitiesStructure = await artiaDB.query('DESCRIBE organization_9115_activities_v2');
    console.log('Colunas:');
    activitiesStructure.forEach(col => {
      console.log(`   - ${col.Field} (${col.Type})`);
    });
    console.log('');

    // Contar registros
    console.log('4️⃣ Contagem de registros:');
    const [usersCount] = await artiaDB.query('SELECT COUNT(*) as total FROM organization_9115_organization_users_v2');
    console.log(`   Usuários: ${usersCount.total}`);

    const [projectsCount] = await artiaDB.query('SELECT COUNT(*) as total FROM organization_9115_projects_v2');
    console.log(`   Projetos: ${projectsCount.total}`);

    const [activitiesCount] = await artiaDB.query('SELECT COUNT(*) as total FROM organization_9115_activities_v2');
    console.log(`   Atividades: ${activitiesCount.total}`);

    console.log('\n✅ Estrutura verificada com sucesso!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await artiaDB.close();
  }
}

testArtiaTables();
