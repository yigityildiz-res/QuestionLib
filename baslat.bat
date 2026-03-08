@echo off
title YKS Soru Çözüm Havuzu
color 0B

echo ===================================================
echo YKS Soru Cozum Havuzu Lokal Sunucusu Baslatiliyor...
echo ===================================================
echo.
echo Lutfen tarayicinizdan su adrese gidin:
echo http://localhost:8000
echo.
echo ---------------------------------------------------
echo SUNUCUYU DURDURMAK ICIN:
echo Bu siyah pencereyi (CMD) kapatmaniz yeterlidir.
echo Yada pencere icindeyken CTRL + C tuslarina basabilirsiniz.
echo ---------------------------------------------------
echo.

start http://localhost:8000
python server.py 8000

pause
