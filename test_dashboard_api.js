async function test() {
  try {
    // 1. Log in to get JWT token
    const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@shivfurniture.com',
        password: 'password123'
      })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) {
      console.error('Login failed:', loginData);
      return;
    }
    const token = loginData.data.token;
    console.log('Login successful, token acquired.');

    // 2. Fetch dashboard statistics
    const dashRes = await fetch('http://localhost:3000/api/v1/dashboard?scope=all', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dashData = await dashRes.json();
    console.log('Dashboard API Response:');
    console.log(JSON.stringify(dashData, null, 2));
  } catch (err) {
    console.error(err);
  }
}

test();
