@echo off
REM ============================================
REM HMS Wake-Up Script for Render Free Tier
REM Run this 2-3 minutes before your demo!
REM ============================================

REM UPDATE THESE URLs after deployment (you'll get them from Render dashboard)
set EUREKA_URL=https://hms-eureka.onrender.com
set GATEWAY_URL=https://hms-gateway.onrender.com
set USERMS_URL=https://hms-userms.onrender.com
set PROFILEMS_URL=https://hms-profilems.onrender.com
set APPOINTMENTMS_URL=https://hms-appointmentms.onrender.com

echo ============================================
echo   HMS - Waking Up All Services
echo   This takes about 60-90 seconds...
echo ============================================
echo.

echo [1/5] Waking up Eureka Server...
curl -s -o nul -w "  Status: %%{http_code}\n" %EUREKA_URL%
echo       Waiting for Eureka to be ready...
timeout /t 30 /nobreak > nul

echo [2/5] Waking up UserMS...
curl -s -o nul -w "  Status: %%{http_code}\n" %USERMS_URL%
timeout /t 10 /nobreak > nul

echo [3/5] Waking up ProfileMS...
curl -s -o nul -w "  Status: %%{http_code}\n" %PROFILEMS_URL%
timeout /t 10 /nobreak > nul

echo [4/5] Waking up AppointmentMS...
curl -s -o nul -w "  Status: %%{http_code}\n" %APPOINTMENTMS_URL%
timeout /t 10 /nobreak > nul

echo [5/5] Waking up Gateway...
curl -s -o nul -w "  Status: %%{http_code}\n" %GATEWAY_URL%
timeout /t 15 /nobreak > nul

echo.
echo ============================================
echo   All services should be awake now!
echo   Verifying Gateway...
echo ============================================
curl -s -o nul -w "  Gateway Status: %%{http_code}\n" %GATEWAY_URL%

echo.
echo   You can now use your app.
echo   Frontend: Check your Vercel URL
echo ============================================
pause
