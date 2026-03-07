import 'dotenv/config';
import axios from 'axios';

async function listAllEmployees() {
  console.log('📋 Listando todos os employees do Factorial...\n');

  try {
    const apiKey = process.env.FACTORIAL_API_KEY;
    const apiUrl = process.env.FACTORIAL_API_URL || 'https://api.factorialhr.com';

    console.log(`🔑 API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'NÃO CONFIGURADA'}`);
    console.log(`📡 API URL: ${apiUrl}\n`);

    // Tentar diferentes endpoints
    const endpoints = [
      '/api/2026-01-01/resources/employees/employees',
      '/api/2025-07-01/resources/employees/employees',
      '/api/v1/core/employees',
      '/api/v2/core/employees'
    ];

    let response = null;
    let successEndpoint = null;

    for (const endpoint of endpoints) {
      try {
        console.log(`Tentando: ${endpoint}`);
        response = await axios.get(`${apiUrl}${endpoint}`, {
          headers: {
            'x-api-key': apiKey,
            'Accept': 'application/json'
          }
        });
        successEndpoint = endpoint;
        console.log(`✅ Sucesso com: ${endpoint}\n`);
        break;
      } catch (err) {
        console.log(`❌ Falhou: ${err.response?.status || err.message}`);
      }
    }

    if (!response) {
      throw new Error('Nenhum endpoint funcionou');
    }

    console.log('✅ Resposta recebida!\n');
    console.log('Status:', response.status);
    console.log('Headers:', JSON.stringify(response.headers, null, 2));
    console.log('\nDados completos:');
    console.log(JSON.stringify(response.data, null, 2));

    const employees = response.data?.data || response.data;

    if (Array.isArray(employees)) {
      console.log(`\n📊 Total de employees: ${employees.length}\n`);
      
      employees.forEach((emp, index) => {
        console.log(`${index + 1}. ${emp.first_name} ${emp.last_name}`);
        console.log(`   Email: ${emp.email || 'N/A'}`);
        console.log(`   ID: ${emp.id}`);
        console.log(`   Status: ${emp.terminated_on ? 'Inativo' : 'Ativo'}`);
        console.log('');
      });
    } else {
      console.log('\n⚠️ Resposta não é um array de employees');
    }

  } catch (error) {
    console.error('\n❌ Erro ao listar employees:');
    console.error(`Mensagem: ${error.message}`);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Status Text: ${error.response.statusText}`);
      console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('Dados:', JSON.stringify(error.response.data, null, 2));
    }
    
    process.exit(1);
  }
}

listAllEmployees();
