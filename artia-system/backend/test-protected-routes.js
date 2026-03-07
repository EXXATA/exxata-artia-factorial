import axios from 'axios';

async function main() {
  const email = 'andre.marquito@exxata.com.br';
  const password = 'factorial123';

  const loginResponse = await axios.post('http://localhost:3000/api/v1/factorial-auth/login', {
    email,
    password
  });

  const token = loginResponse.data?.data?.token;
  const headers = { Authorization: `Bearer ${token}` };

  const results = {};

  for (const [key, url] of Object.entries({
    events: 'http://localhost:3000/api/v1/events?startDate=2026-03-02&endDate=2026-03-08',
    projects: 'http://localhost:3000/api/v1/projects',
    workedHours: 'http://localhost:3000/api/v1/worked-hours/history'
  })) {
    try {
      const response = await axios.get(url, { headers });
      results[key] = {
        status: response.status,
        success: response.data?.success,
        dataType: Array.isArray(response.data?.data) ? 'array' : typeof response.data?.data,
      };
    } catch (error) {
      results[key] = {
        status: error.response?.status || null,
        message: error.response?.data?.message || error.message,
        data: error.response?.data || null,
      };
    }
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    message: error.message,
    status: error.response?.status || null,
    data: error.response?.data || null
  }, null, 2));
  process.exit(1);
});
