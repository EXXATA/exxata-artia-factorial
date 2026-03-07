import { connectDatabase, disconnectDatabase } from '../src/infrastructure/database/connection.js';
import { UserRepository } from '../src/infrastructure/database/mongodb/UserRepository.js';
import bcrypt from 'bcryptjs';

async function setup() {
  console.log('🚀 Iniciando setup do sistema Artia...\n');

  try {
    await connectDatabase();

    const userRepo = new UserRepository();

    const adminEmail = 'admin@artia.com';
    const existingAdmin = await userRepo.findByEmail(adminEmail);

    if (existingAdmin) {
      console.log('⚠️  Usuário admin já existe');
    } else {
      const passwordHash = await bcrypt.hash('admin123', 10);
      
      await userRepo.create({
        id: `user_${Date.now()}_admin`,
        email: adminEmail,
        passwordHash,
        name: 'Administrador'
      });

      console.log('✅ Usuário admin criado com sucesso!');
      console.log('📧 Email: admin@artia.com');
      console.log('🔑 Senha: admin123');
      console.log('\n⚠️  IMPORTANTE: Altere a senha após o primeiro login!\n');
    }

    console.log('✅ Setup concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante setup:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

setup();
