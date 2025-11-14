@echo off
REM Deployment script cho Kong Gateway setup trên Windows

echo 🚀 Deploying Chat App với Kong API Gateway...

REM 1. Build và start services
echo 📦 Building services...
docker-compose build

REM 2. Start infrastructure services first
echo 🏗️ Starting infrastructure services...
docker-compose up -d mongo redis zookeeper kafka

REM Wait for services to be ready
echo ⏳ Waiting for infrastructure services...
timeout /t 30 /nobreak > nul

REM 3. Start application services
echo 🚀 Starting application services...
docker-compose up -d rest-api websocket-service frontend

REM Wait for services to be ready
echo ⏳ Waiting for application services...
timeout /t 20 /nobreak > nul

REM 4. Start Kong Gateway
echo 🌐 Starting Kong Gateway...
docker-compose up -d kong

REM Wait for Kong to be ready
echo ⏳ Waiting for Kong Gateway...
timeout /t 10 /nobreak > nul

REM 5. Verify services
echo ✅ Verifying services...

REM Check Kong
curl -f http://localhost:8001/status > nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Kong Gateway is running
) else (
    echo ❌ Kong Gateway failed to start
)

REM Check REST API through Kong
curl -f http://localhost:8000/api/auth/check > nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ REST API accessible through Kong
) else (
    echo ❌ REST API not accessible through Kong
)

REM Check Frontend through Kong
curl -f http://localhost:8000/ > nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Frontend accessible through Kong
) else (
    echo ❌ Frontend not accessible through Kong
)

echo.
echo 🎉 Deployment completed!
echo.
echo 📋 Service URLs:
echo   🌐 Kong Gateway:     http://localhost:8000
echo   🔧 Kong Admin API:    http://localhost:8001
echo   📊 Kong Manager:      http://localhost:8002
echo   🎨 Frontend:          http://localhost:8000
echo   🔌 REST API:          http://localhost:8000/api
echo   📡 WebSocket:         ws://localhost:8000/ws
echo.
echo 🔑 Test Authentication:
echo   curl -X POST http://localhost:8000/api/auth/signin ^
echo     -H "Content-Type: application/json" ^
echo     -d "{\"username\":\"test\",\"password\":\"test\"}"
echo.
echo 📊 Monitor Kong:
echo   curl http://localhost:8001/status
echo   curl http://localhost:8001/services
echo   curl http://localhost:8001/routes

pause
