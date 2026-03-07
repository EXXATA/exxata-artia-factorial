import 'dotenv/config';
import axios from 'axios';

// Teste direto conforme documentação Factorial
async function testRawAPI() {
  const apiKey = process.env.FACTORIAL_API_KEY;
  
  console.log('🧪 Testando API Factorial - Formato Raw\n');
  console.log(`🔑 API Key: ${apiKey ? apiKey.substring(0, 20) + '...' : 'NÃO CONFIGURADA'}\n`);

  // Testar endpoint de credentials primeiro (sabemos que existe)
  try {
    console.log('📋 Teste 1: Endpoint de Credentials (sabemos que existe)');
    console.log('GET /api/2026-01-01/resources/api_public/credentials\n');
    
    const credResponse = await axios.get('https://api.factorialhr.com/api/2026-01-01/resources/api_public/credentials', {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json'
      }
    });

    console.log('✅ Credentials endpoint funcionou!');
    console.log('Status:', credResponse.status);
    console.log('Dados:', JSON.stringify(credResponse.data, null, 2));
    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Erro no credentials endpoint:');
    console.error('Status:', error.response?.status);
    console.error('Dados:', JSON.stringify(error.response?.data, null, 2));
    console.log('\n' + '='.repeat(60) + '\n');
  }

  // Agora tentar employees com diferentes formatos
  const employeeEndpoints = [
    '/api/2026-01-01/resources/employees/employees',
    '/api/2026-01-01/core/employees',
    '/api/v1/employees',
    '/employees'
  ];

  for (const endpoint of employeeEndpoints) {
    try {
      console.log(`📋 Testando: ${endpoint}`);
      
      const response = await axios.get(`https://api.factorialhr.com${endpoint}`, {
        headers: {
          'x-api-key': apiKey,
          'Accept': 'application/json'
        }
      });

      console.log(`✅ SUCESSO! Endpoint correto: ${endpoint}`);
      console.log('Status:', response.status);
      console.log('Dados:', JSON.stringify(response.data, null, 2).substring(0, 500));
      break;

    } catch (error) {
      console.log(`❌ Falhou: ${error.response?.status || error.message}`);
    }
  }
}

testRawAPI();
