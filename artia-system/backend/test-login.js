import axios from 'axios';

async function testLogin() {
  console.log('🧪 Testando login após registro...\n');

  const email = 'andre.marquito@exxata.com.br';
  const password = 'factorial123';

  try {
    // Tentar login
    console.log('📋 Tentando login...');
    const response = await axios.post('http://localhost:3000/api/v1/factorial-auth/login', {
      email,
      password
    });

    console.log('✅ Login bem-sucedido!');
    console.log('Token:', response.data.data.token.substring(0, 20) + '...');
    console.log('User:', response.data.data.user);

  } catch (error) {
    console.error('❌ Erro no login:');
    console.error('Status:', error.response?.status);
    console.error('Mensagem:', error.response?.data?.message);
    console.error('Dados:', JSON.stringify(error.response?.data, null, 2));
  }
}

testLogin();
