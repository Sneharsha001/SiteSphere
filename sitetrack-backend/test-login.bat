@echo off
echo Testing valid login...
curl -s -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@sitetrack.dev\",\"password\":\"Admin@123\"}"
echo.
echo.
echo Testing invalid password...
curl -s -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@sitetrack.dev\",\"password\":\"wrongpassword\"}"
echo.
