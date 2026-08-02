const http = require('http')

function post(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }
    const req = http.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }))
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

async function run() {
  console.log('=== TEST 1: Valid login ===')
  const r1 = await post({ email: 'admin@sitetrack.dev', password: 'Admin@123' })
  console.log('Status:', r1.status)
  if (r1.status === 200) {
    console.log('✅ PASS — got token:', r1.body.token ? r1.body.token.substring(0, 40) + '...' : 'MISSING')
    console.log('   User:', JSON.stringify(r1.body.user))
    if (r1.body.user && r1.body.user.passwordHash) {
      console.log('❌ FAIL — passwordHash exposed in response!')
      process.exit(1)
    }
  } else {
    console.log('❌ FAIL — expected 200, got', r1.status, JSON.stringify(r1.body))
    process.exit(1)
  }

  console.log()
  console.log('=== TEST 2: Invalid password ===')
  const r2 = await post({ email: 'admin@sitetrack.dev', password: 'wrongpassword' })
  console.log('Status:', r2.status)
  if (r2.status === 401) {
    console.log('✅ PASS — correctly rejected with 401')
    console.log('   Message:', r2.body.message)
  } else {
    console.log('❌ FAIL — expected 401, got', r2.status, JSON.stringify(r2.body))
    process.exit(1)
  }

  console.log()
  console.log('🎉 All tests passed! Safe to commit.')
}

run().catch(console.error)
