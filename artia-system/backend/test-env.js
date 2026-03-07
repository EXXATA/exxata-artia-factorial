import 'dotenv/config';

console.log('🔍 Verificando variáveis de ambiente do MySQL:\n');

console.log('ARTIA_DB_HOST:', process.env.ARTIA_DB_HOST || '❌ NÃO DEFINIDO');
console.log('ARTIA_DB_PORT:', process.env.ARTIA_DB_PORT || '❌ NÃO DEFINIDO');
console.log('ARTIA_DB_USER:', process.env.ARTIA_DB_USER || '❌ NÃO DEFINIDO');
console.log('ARTIA_DB_PASSWORD:', process.env.ARTIA_DB_PASSWORD ? '✅ DEFINIDO (oculto)' : '❌ NÃO DEFINIDO');
console.log('ARTIA_DB_NAME:', process.env.ARTIA_DB_NAME || '❌ NÃO DEFINIDO');

console.log('\n📋 Comprimento da senha:', process.env.ARTIA_DB_PASSWORD?.length || 0, 'caracteres');
