async function testRateLimit() {
  const url = 'http://localhost:3001/api/chats'; // Any endpoint
  const promises = [];
  
  console.log('Sending 12 requests to test rate limit (limit is 10)...');
  
  for (let i = 0; i < 12; i++) {
    promises.push(
      fetch(url)
        .then(res => ({ status: res.status, ok: res.status !== 429 }))
    );
  }
  
  const results = await Promise.all(promises);
  const successes = results.filter(r => r.ok).length;
  const failures = results.filter(r => !r.ok).length;
  
  console.log(`Successes: ${successes}`);
  console.log(`Failures (429): ${failures}`);
  
  if (failures > 0) {
    console.log('PASS: Rate limit is working.');
  } else {
    console.log('FAIL: Rate limit did not trigger.');
  }
}

testRateLimit();
