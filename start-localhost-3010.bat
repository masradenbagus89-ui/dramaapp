@echo off
title DramaKu LOKAL - JANGAN DITUTUP
cd /d "%~dp0"
echo.
echo  ================================================
echo   DramaKu lokal
echo   Chrome:  http://127.0.0.1:3055/admin
echo.
echo   JANGAN TUTUP jendela ini.
echo   Kalau server mati, akan otomatis nyala lagi.
echo  ================================================
echo.

:loop
echo [%date% %time%] Menyalakan server...
"C:\Program Files\nodejs\node.exe" "%~dp0node_modules\next\dist\bin\next" dev -p 3055 -H 127.0.0.1
echo.
echo [%date% %time%] Server BERHENTI (kode=%ERRORLEVEL%). Nyala ulang 3 detik...
timeout /t 3 /nobreak >nul
goto loop
