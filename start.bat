@echo off
title Question Library
color 0B

echo ===================================================
echo  Question Library - Local Server Starting...
echo ===================================================
echo.
echo Open your browser and navigate to:
echo http://localhost:8000
echo.
echo ---------------------------------------------------
echo TO STOP THE SERVER:
echo Close this window (CMD), or press CTRL+C inside it.
echo ---------------------------------------------------
echo.

start http://localhost:8000
python server.py 8000

pause
