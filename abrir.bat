@echo off
cd /d "%~dp0"
echo Precar em http://localhost:8877
start http://localhost:8877
python -m http.server 8877 --directory "%~dp0"
