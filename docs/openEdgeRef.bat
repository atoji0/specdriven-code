@echo off
set CURRENT_DIR=%~dp0
set EDGE_PATH="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
%EDGE_PATH% --disable-web-security --user-data-dir="%TEMP%\specdriven-edge-profile" "%CURRENT_DIR%index.ref.html"