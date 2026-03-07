import 'dotenv/config';
import { artiaDB } from './src/infrastructure/database/mysql/ArtiaDBConnection.js';

async function checkColumns() {
  try {
    await artiaDB.connect();
    
    console.log('📋 Colunas da tabela organization_9115_projects_v2:\n');
    const columns = await artiaDB.query('DESCRIBE organization_9115_projects_v2');
    
    columns.forEach(col => {
      console.log(`- ${col.Field} (${col.Type})`);
    });
    
    console.log('\n📊 Exemplo de dados (1 registro):');
    const [sample] = await artiaDB.query('SELECT * FROM organization_9115_projects_v2 WHERE object_type = "project" LIMIT 1');
    if (sample) {
      console.log(JSON.stringify(sample, null, 2));
    }
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await artiaDB.close();
  }
}

checkColumns();
