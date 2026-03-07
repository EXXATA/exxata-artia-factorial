import 'dotenv/config';

console.log('🔍 Debug das variáveis de ambiente MySQL:\n');

const host = process.env.ARTIA_DB_HOST;
const port = process.env.ARTIA_DB_PORT;
const user = process.env.ARTIA_DB_USER;
const password = process.env.ARTIA_DB_PASSWORD;
const database = process.env.ARTIA_DB_NAME;

console.log('ARTIA_DB_HOST:', host);
console.log('ARTIA_DB_PORT:', port);
console.log('ARTIA_DB_USER:', user);
console.log('ARTIA_DB_USER (length):', user?.length, 'caracteres');
console.log('ARTIA_DB_USER (primeiro char):', user?.charAt(0));
console.log('ARTIA_DB_USER (último char):', user?.charAt(user.length - 1));
console.log('ARTIA_DB_PASSWORD:', password ? `[${password.length} caracteres]` : 'NÃO DEFINIDO');
console.log('ARTIA_DB_NAME:', database);

console.log('\n⚠️  ATENÇÃO:');
console.log('Se o usuário aparecer com chaves { }, remova-as do .env');
console.log('Exemplo ERRADO: ARTIA_DB_USER={cliente-9115}');
console.log('Exemplo CORRETO: ARTIA_DB_USER=cliente-9115');
