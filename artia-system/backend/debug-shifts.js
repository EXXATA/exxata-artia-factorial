import 'dotenv/config';
import axios from 'axios';

async function debugShifts() {
  const apiKey = process.env.FACTORIAL_API_KEY;
  const employeeId = 950689; // André
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  console.log('🔍 Debugando formato de shifts\n');
  console.log(`Employee ID: ${employeeId}`);
  console.log(`Período: ${startDate.toISOString().split('T')[0]} a ${endDate.toISOString().split('T')[0]}\n`);

  try {
    const response = await axios.get('https://api.factorialhr.com/api/2026-01-01/resources/attendance/shifts', {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json'
      },
      params: {
        employee_id: employeeId,
        from: startDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0]
      }
    });

    const shifts = response.data?.data || response.data || [];
    
    console.log(`✅ ${shifts.length} shifts retornados\n`);
    
    if (shifts.length > 0) {
      console.log('📋 Primeiros 3 shifts (estrutura completa):\n');
      shifts.slice(0, 3).forEach((shift, index) => {
        console.log(`Shift ${index + 1}:`);
        console.log(JSON.stringify(shift, null, 2));
        console.log('\n' + '-'.repeat(60) + '\n');
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

debugShifts();
