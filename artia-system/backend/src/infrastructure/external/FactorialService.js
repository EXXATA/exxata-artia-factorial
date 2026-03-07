import axios from 'axios';

export class FactorialService {
  constructor() {
    this.apiKey = process.env.FACTORIAL_API_KEY;
    this.apiUrl = process.env.FACTORIAL_API_URL || 'https://api.factorialhr.com';
    
    if (!this.apiKey) {
      throw new Error('FACTORIAL_API_KEY não configurada no .env');
    }

    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'x-api-key': this.apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Busca employee no Factorial por email
   * @param {string} email - Email do employee
   * @returns {Promise<object|null>} Employee ou null se não encontrado
   */
  async getEmployeeByEmail(email) {
    try {
      // API Key não suporta filtro por email, então buscamos todos e filtramos localmente
      const response = await this.client.get('/api/2026-01-01/resources/employees/employees');

      const employees = response.data?.data || response.data;
      
      if (!Array.isArray(employees) || employees.length === 0) {
        return null;
      }

      // Filtrar por email localmente
      const employee = employees.find(emp => emp.email?.toLowerCase() === email.toLowerCase());
      
      if (!employee) {
        return null;
      }
      
      return {
        id: employee.id,
        email: employee.email,
        firstName: employee.first_name,
        lastName: employee.last_name,
        fullName: `${employee.first_name} ${employee.last_name}`,
        status: employee.terminated_on ? 'inactive' : 'active',
        isActive: !employee.terminated_on
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error(`Erro ao buscar employee no Factorial: ${error.message}`);
    }
  }

  /**
   * Busca employee no Factorial por ID
   * @param {string} employeeId - ID do employee
   * @returns {Promise<object>}
   */
  async getEmployeeById(employeeId) {
    try {
      const response = await this.client.get(`/api/v1/core/employees/${employeeId}`);
      const employee = response.data?.data || response.data;

      return {
        id: employee.id,
        email: employee.email,
        firstName: employee.first_name,
        lastName: employee.last_name,
        fullName: `${employee.first_name} ${employee.last_name}`,
        status: employee.terminated_on ? 'inactive' : 'active',
        isActive: !employee.terminated_on
      };
    } catch (error) {
      throw new Error(`Erro ao buscar employee ${employeeId} no Factorial: ${error.message}`);
    }
  }

  /**
   * Busca shifts (clock in/out) de um employee por período
   * @param {string} employeeId - ID do employee
   * @param {Date} startDate - Data inicial
   * @param {Date} endDate - Data final
   * @returns {Promise<Array>}
   */
  async getShiftsByDateRange(employeeId, startDate, endDate) {
    try {
      const response = await this.client.get('/api/2026-01-01/resources/attendance/shifts', {
        params: {
          employee_id: employeeId,
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0]
        }
      });

      const shifts = response.data?.data || response.data || [];
      
      return shifts.map(shift => {
        // Factorial retorna date + clock_in/out como strings de hora
        const day = shift.date || shift.reference_date;
        const clockIn = day && shift.clock_in ? new Date(`${day}T${shift.clock_in}`) : null;
        const clockOut = day && shift.clock_out ? new Date(`${day}T${shift.clock_out}`) : null;
        
        // Factorial já retorna minutes calculado
        const workingHours = shift.minutes ? shift.minutes / 60 : 0;
        
        return {
          id: shift.id,
          employeeId: shift.employee_id,
          clockIn,
          clockOut,
          day,
          observations: shift.observations,
          workingHours
        };
      });
    } catch (error) {
      throw new Error(`Erro ao buscar shifts no Factorial: ${error.message}`);
    }
  }

  /**
   * Calcula horas trabalhadas em um shift
   * @param {object} shift - Shift do Factorial
   * @returns {number} Horas trabalhadas
   */
  calculateShiftHours(shift) {
    // Factorial já retorna minutes calculado
    if (shift.minutes) {
      return shift.minutes / 60;
    }

    // Fallback: calcular manualmente se minutes não estiver disponível
    if (!shift.clock_in || !shift.clock_out) {
      return 0;
    }

    const day = shift.date || shift.reference_date;
    if (!day) return 0;

    const clockIn = new Date(`${day}T${shift.clock_in}`);
    const clockOut = new Date(`${day}T${shift.clock_out}`);
    
    if (isNaN(clockIn.getTime()) || isNaN(clockOut.getTime())) {
      return 0;
    }

    const diffMs = clockOut - clockIn;
    const diffHours = diffMs / (1000 * 60 * 60);

    return Math.max(0, diffHours);
  }

  /**
   * Busca horas trabalhadas de um employee em um dia específico
   * @param {string} employeeId - ID do employee
   * @param {Date} date - Data
   * @returns {Promise<number>} Total de horas trabalhadas
   */
  async getWorkedHoursByDay(employeeId, date) {
    const shifts = await this.getShiftsByDateRange(employeeId, date, date);
    
    return shifts.reduce((total, shift) => total + shift.workingHours, 0);
  }

  /**
   * Busca horas trabalhadas de um employee em um mês
   * @param {string} employeeId - ID do employee
   * @param {number} year - Ano
   * @param {number} month - Mês (1-12)
   * @returns {Promise<object>} Objeto com horas por dia
   */
  async getMonthlyWorkedHours(employeeId, year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const shifts = await this.getShiftsByDateRange(employeeId, startDate, endDate);

    // Agrupa por dia
    const hoursByDay = {};
    
    shifts.forEach(shift => {
      const day = shift.day || shift.clockIn?.toISOString().split('T')[0];
      if (day) {
        hoursByDay[day] = (hoursByDay[day] || 0) + shift.workingHours;
      }
    });

    return hoursByDay;
  }

  /**
   * Busca todo histórico de horas trabalhadas de um employee
   * @param {string} employeeId - ID do employee
   * @returns {Promise<object>} Objeto com horas por dia
   */
  async getAllWorkedHours(employeeId) {
    try {
      // Busca shifts dos últimos 2 anos (ajustar conforme necessário)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 2);

      const shifts = await this.getShiftsByDateRange(employeeId, startDate, endDate);

      // Agrupa por dia
      const hoursByDay = {};
      
      shifts.forEach(shift => {
        if (!shift.day) return;
        
        hoursByDay[shift.day] = (hoursByDay[shift.day] || 0) + shift.workingHours;
      });

      return hoursByDay;
    } catch (error) {
      throw new Error(`Erro ao buscar histórico de horas no Factorial: ${error.message}`);
    }
  }
}
