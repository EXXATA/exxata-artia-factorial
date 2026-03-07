import 'dotenv/config';
import { artiaDB } from './src/infrastructure/database/mysql/ArtiaDBConnection.js';

async function testConnection() {
  console.log('🔍 Testando conexão com banco MySQL do Artia...\n');

  try {
    // Teste 1: Conexão básica
    console.log('1️⃣ Testando conexão básica...');
    const pool = await artiaDB.connect();
    console.log('✅ Conexão estabelecida com sucesso!\n');

    // Teste 2: Verificar tabelas existentes
    console.log('2️⃣ Verificando tabelas disponíveis...');
    const tables = await artiaDB.query('SHOW TABLES');
    console.log(`✅ Encontradas ${tables.length} tabelas:`);
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`   - ${tableName}`);
    });
    console.log('');

    // Teste 3: Verificar estrutura da tabela usuarios
    console.log('3️⃣ Verificando estrutura da tabela usuarios...');
    try {
      const usuariosStructure = await artiaDB.query('DESCRIBE usuarios');
      console.log('✅ Estrutura da tabela usuarios:');
      usuariosStructure.forEach(col => {
        console.log(`   - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
      console.log('');
    } catch (error) {
      console.log('⚠️  Tabela usuarios não encontrada ou sem acesso');
      console.log(`   Erro: ${error.message}\n`);
    }

    // Teste 5: Verificar estrutura da tabela projetos
    console.log('5️⃣ Verificando estrutura da tabela projetos...');
    try {
      const projetosStructure = await artiaDB.query('DESCRIBE projetos');
      console.log('✅ Estrutura da tabela projetos:');
      projetosStructure.forEach(col => {
        console.log(`   - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
      console.log('');
    } catch (error) {
      console.log('⚠️  Tabela projetos não encontrada ou sem acesso');
      console.log(`   Erro: ${error.message}\n`);
    }

    // Teste 5: Verificar estrutura da tabela atividades
    console.log('5️⃣ Verificando estrutura da tabela atividades...');
    try {
      const atividadesStructure = await artiaDB.query('DESCRIBE atividades');
      console.log('✅ Estrutura da tabela atividades:');
      atividadesStructure.forEach(col => {
        console.log(`   - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
      console.log('');
    } catch (error) {
      console.log('⚠️  Tabela atividades não encontrada ou sem acesso');
      console.log(`   Erro: ${error.message}\n`);
    }

    // Teste 7: Contar registros
    console.log('7️⃣ Contando registros...');
    try {
      const [usuariosCount] = await artiaDB.query('SELECT COUNT(*) as total FROM usuarios');
      console.log(`✅ Usuários: ${usuariosCount.total} registros`);
    } catch (error) {
      console.log(`⚠️  Erro ao contar usuários: ${error.message}`);
    }

    try {
      const [projetosCount] = await artiaDB.query('SELECT COUNT(*) as total FROM projetos');
      console.log(`✅ Projetos: ${projetosCount.total} registros`);
    } catch (error) {
      console.log(`⚠️  Erro ao contar projetos: ${error.message}`);
    }

    try {
      const [atividadesCount] = await artiaDB.query('SELECT COUNT(*) as total FROM atividades');
      console.log(`✅ Atividades: ${atividadesCount.total} registros`);
    } catch (error) {
      console.log(`⚠️  Erro ao contar atividades: ${error.message}`);
    }

    console.log('\n✅ Teste de conexão concluído com sucesso!');

  } catch (error) {
    console.error('\n❌ Erro ao conectar ao banco MySQL do Artia:');
    console.error(`   ${error.message}`);
    console.error('\n📋 Verifique:');
    console.error('   1. Credenciais no arquivo .env');
    console.error('   2. Servidor MySQL está acessível');
    console.error('   3. Firewall/VPN se necessário');
    console.error('   4. Permissões do usuário MySQL');
  } finally {
    await artiaDB.close();
    console.log('\n🔌 Conexão fechada.');
  }
}

testConnection();
