import axios from 'axios';

export class FactorialService {
  constructor() {
    this.apiKey = process.env.FACTORIAL_API_KEY;
    this.apiUrl = process.env.FACTORIAL_API_URL || 'https://api.factorialhr.com';

    if (!this.apiKey) {
      throw new Error('FACTORIAL_API_KEY não configurada no ambiente');
    }

    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'x-api-key': this.apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  createIntegrationError(message, statusCode = 502, details = {}) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = details.code || 'FACTORIAL_INTEGRATION_ERROR';
    error.details = details;
    return error;
  }

  handleFactorialError(error, fallbackMessage) {
    if (error.response?.status === 404) {
      return null;
    }

    if (error.response?.status === 401 || error.response?.status === 403) {
      throw this.createIntegrationError(
        'Integração com Factorial indisponível por falha de autenticação. Verifique FACTORIAL_API_KEY.',
        503,
        { providerStatus: error.response.status, code: 'FACTORIAL_AUTH_FAILED' }
      );
    }

    throw this.createIntegrationError(
      `${fallbackMessage}: ${error.message}`,
      502,
      { providerStatus: error.response?.status || null }
    );
  }

  async getEmployeeByEmail(email) {
    try {
      const response = await this.client.get('/api/2026-01-01/resources/employees/employees');
      const employees = response.data?.data || response.data;

      if (!Array.isArray(employees) || employees.length === 0) {
        return null;
      }

      const employee = employees.find((entry) => entry.email?.toLowerCase() === email.toLowerCase());

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
      const notFound = this.handleFactorialError(error, 'Erro ao buscar employee no Factorial');
      if (notFound === null) {
        return null;
      }
      throw notFound;
    }
  }

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
      const notFound = this.handleFactorialError(error, `Erro ao buscar employee ${employeeId} no Factorial`);
      if (notFound === null) {
        return null;
      }
      throw notFound;
    }
  }

  async getShiftsByDateRange(employeeId, startDate, endDate) {
    try {
      const response = await this.client.get('/api/2026-01-01/resources/attendance/shifts', {
        params: {
          employee_id: employeeId,
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0]
        }
      });

      const allShifts = response.data?.data || response.data || [];
      const shifts = allShifts.filter((shift) => String(shift.employee_id) === String(employeeId));

      return shifts.map((shift) => {
        const day = shift.date || shift.reference_date;
        const clockIn = day && shift.clock_in ? new Date(`${day}T${shift.clock_in}`) : null;
        const clockOut = day && shift.clock_out ? new Date(`${day}T${shift.clock_out}`) : null;
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
      throw this.handleFactorialError(error, 'Erro ao buscar shifts no Factorial');
    }
  }

  calculateShiftHours(shift) {
    if (shift.minutes) {
      return shift.minutes / 60;
    }

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
    return Math.max(0, diffMs / (1000 * 60 * 60));
  }

  async getWorkedHoursByDay(employeeId, date) {
    const shifts = await this.getShiftsByDateRange(employeeId, date, date);
    return shifts.reduce((total, shift) => total + shift.workingHours, 0);
  }

  async getMonthlyWorkedHours(employeeId, year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const shifts = await this.getShiftsByDateRange(employeeId, startDate, endDate);
    const hoursByDay = {};

    shifts.forEach((shift) => {
      const day = shift.day || shift.clockIn?.toISOString().split('T')[0];
      if (day) {
        hoursByDay[day] = (hoursByDay[day] || 0) + shift.workingHours;
      }
    });

    return hoursByDay;
  }

  async getAllWorkedHours(employeeId) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 2);

      const shifts = await this.getShiftsByDateRange(employeeId, startDate, endDate);
      const hoursByDay = {};

      shifts.forEach((shift) => {
        if (!shift.day) {
          return;
        }

        hoursByDay[shift.day] = (hoursByDay[shift.day] || 0) + shift.workingHours;
      });

      return hoursByDay;
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }

      throw this.createIntegrationError(
        `Erro ao buscar histórico de horas no Factorial: ${error.message}`,
        502,
        { providerStatus: error.response?.status || null }
      );
    }
  }
}
