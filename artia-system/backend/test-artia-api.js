import 'dotenv/config';
import axios from 'axios';

const ARTIA_API_URL = process.env.ARTIA_API_URL || 'https://api.artia.com';

async function testArtiaAPI() {
  console.log('🔍 Testando API REST do Artia...\n');
  console.log(`📡 URL: ${ARTIA_API_URL}\n`);

  // Teste 1: Verificar se API está acessível
  console.log('1️⃣ Verificando se API está acessível...');
  try {
    const response = await axios.get(`${ARTIA_API_URL}/health`, {
      timeout: 5000,
      validateStatus: () => true // Aceita qualquer status
    });
    console.log(`✅ API respondeu com status: ${response.status}`);
    console.log('');
  } catch (error) {
    if (error.code === 'ENOTFOUND') {
      console.log('❌ API não encontrada - verifique a URL');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('❌ Timeout - API não respondeu');
    } else {
      console.log(`⚠️  Erro: ${error.message}`);
    }
    console.log('');
  }

  // Teste 2: Tentar login (requer credenciais válidas)
  console.log('2️⃣ Para testar login, você precisará:');
  console.log('   - Email e senha válidos do Artia');
  console.log('   - Executar: POST /api/v1/artia-auth/login');
  console.log('   - Body: { "email": "seu@email.com", "password": "senha" }');
  console.log('');

  console.log('📋 Endpoints disponíveis:');
  console.log('   - POST /api/v1/artia-auth/login - Fazer login');
  console.log('   - POST /api/v1/artia-auth/validate - Validar token');
  console.log('   - POST /api/v1/artia-auth/sync-projects - Sincronizar projetos');
  console.log('');

  console.log('✅ Sistema configurado para usar API REST do Artia!');
  console.log('');
  console.log('💡 Quando as permissões MySQL forem concedidas:');
  console.log('   1. Atualize as credenciais no .env');
  console.log('   2. Execute: node test-mysql-connection.js');
  console.log('   3. Mude frontend para usar /api/v1/artia-db/login');
}

testArtiaAPI();
