import crypto from 'crypto';

console.log('🔐 Gerando secrets para produção...\n');

const jwtSecret = crypto.randomBytes(32).toString('hex');
const jwtRefreshSecret = crypto.randomBytes(32).toString('hex');

console.log('Copie estes valores para as variáveis de ambiente da Vercel:\n');
console.log('JWT_SECRET=');
console.log(jwtSecret);
console.log('\nJWT_REFRESH_SECRET=');
console.log(jwtRefreshSecret);
console.log('\n⚠️  IMPORTANTE: Guarde estes valores em local seguro!');
console.log('⚠️  Não compartilhe estes secrets publicamente!\n');
