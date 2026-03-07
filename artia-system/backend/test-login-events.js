import axios from 'axios';

async function testLoginAndEvents() {
  const email = 'andre.marquito@exxata.com.br';
  const password = 'factorial123';

  const loginResponse = await axios.post('http://localhost:3000/api/v1/factorial-auth/login', {
    email,
    password
  });

  const token = loginResponse.data?.data?.token;

  const eventsResponse = await axios.get('http://localhost:3000/api/v1/events', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  console.log(JSON.stringify({
    loginSuccess: loginResponse.status === 200,
    hasToken: Boolean(token),
    eventsStatus: eventsResponse.status,
    eventsSuccess: eventsResponse.data?.success,
    eventsType: Array.isArray(eventsResponse.data?.data) ? 'array' : typeof eventsResponse.data?.data,
    eventsCount: Array.isArray(eventsResponse.data?.data) ? eventsResponse.data.data.length : null
  }, null, 2));
}

testLoginAndEvents().catch((error) => {
  console.error(JSON.stringify({
    message: error.message,
    status: error.response?.status,
    data: error.response?.data
  }, null, 2));
  process.exit(1);
});
