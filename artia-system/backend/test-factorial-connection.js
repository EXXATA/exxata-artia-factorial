import 'dotenv/config';
import { FactorialService } from './src/infrastructure/external/FactorialService.js';

async function testFactorialConnection() {
  console.log('🧪 Testando conexão com Factorial API...\n');

  try {
    const factorialService = new FactorialService();
    console.log('✅ FactorialService inicializado');
    console.log(`📡 API URL: ${factorialService.apiUrl}`);
    console.log(`🔑 API Key configurada: ${factorialService.apiKey ? 'Sim' : 'Não'}\n`);

    // Teste 1: Buscar employee por email
    console.log('📋 Teste 1: Buscar employee por email');
    const testEmail = process.argv[2] || 'andre.marquito@exxata.com.br';
    console.log(`   Email de teste: ${testEmail}`);
    
    const employee = await factorialService.getEmployeeByEmail(testEmail);
    
    if (employee) {
      console.log('✅ Employee encontrado:');
      console.log(`   ID: ${employee.id}`);
      console.log(`   Nome: ${employee.fullName}`);
      console.log(`   Email: ${employee.email}`);
      console.log(`   Status: ${employee.status}`);
      console.log(`   Ativo: ${employee.isActive ? 'Sim' : 'Não'}\n`);

      // Teste 2: Buscar shifts do employee
      console.log('📋 Teste 2: Buscar shifts (últimos 7 dias)');
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const shifts = await factorialService.getShiftsByDateRange(
        employee.id,
        startDate,
        endDate
      );

      console.log(`✅ ${shifts.length} shifts encontrados`);
      
      if (shifts.length > 0) {
        console.log('\n   Últimos shifts:');
        shifts.slice(0, 3).forEach(shift => {
          console.log(`   - ${shift.day}: ${shift.workingHours.toFixed(2)}h`);
        });
      }

      // Teste 3: Buscar histórico completo
      console.log('\n📋 Teste 3: Buscar histórico completo de horas');
      const allHours = await factorialService.getAllWorkedHours(employee.id);
      const totalDays = Object.keys(allHours).length;
      const totalHours = Object.values(allHours).reduce((sum, h) => sum + h, 0);

      console.log(`✅ Histórico carregado:`);
      console.log(`   Total de dias: ${totalDays}`);
      console.log(`   Total de horas: ${totalHours.toFixed(2)}h`);

    } else {
      console.log(`⚠️  Employee não encontrado com email: ${testEmail}`);
      console.log('   Tente com um email válido do Factorial');
    }

    console.log('\n✅ Todos os testes concluídos com sucesso!');

  } catch (error) {
    console.error('\n❌ Erro ao testar Factorial API:');
    console.error(`   ${error.message}`);
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Dados: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    process.exit(1);
  }
}

console.log('='.repeat(60));
console.log('TESTE DE CONEXÃO FACTORIAL API');
console.log('='.repeat(60));
console.log();

testFactorialConnection();
