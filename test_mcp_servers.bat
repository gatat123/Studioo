@echo off
echo ================================================
echo MCP Server Test Script for Windows
echo ================================================
echo.

echo Testing PowerShell execution...
powershell.exe -NoProfile -Command "Write-Host 'PowerShell works!'"
echo.

echo Testing npx availability...
powershell.exe -NoProfile -Command "npx --version"
echo.

echo ================================================
echo Testing individual MCP servers...
echo ================================================
echo.

echo [1/10] Testing ESLint MCP...
powershell.exe -NoProfile -Command "npx -y @eslint/mcp --help 2>&1 | Select-Object -First 5"
if %ERRORLEVEL% EQU 0 (echo SUCCESS) else (echo FAILED)
echo.

echo [2/10] Testing GitHub MCP...
powershell.exe -NoProfile -Command "npx -y @modelcontextprotocol/server-github --help 2>&1 | Select-Object -First 5"
if %ERRORLEVEL% EQU 0 (echo SUCCESS) else (echo FAILED)
echo.

echo [3/10] Testing Context7 MCP...
powershell.exe -NoProfile -Command "npx -y @upstash/context7-mcp@latest --help 2>&1 | Select-Object -First 5"
if %ERRORLEVEL% EQU 0 (echo SUCCESS) else (echo FAILED)
echo.

echo [4/10] Testing Brave Search MCP...
powershell.exe -NoProfile -Command "npx -y @modelcontextprotocol/server-brave-search --help 2>&1 | Select-Object -First 5"
if %ERRORLEVEL% EQU 0 (echo SUCCESS) else (echo FAILED)
echo.

echo [5/10] Testing Filesystem MCP...
powershell.exe -NoProfile -Command "npx -y @modelcontextprotocol/server-filesystem --help 2>&1 | Select-Object -First 5"
if %ERRORLEVEL% EQU 0 (echo SUCCESS) else (echo FAILED)
echo.

echo [6/10] Testing SQLite MCP...
powershell.exe -NoProfile -Command "npx -y mcp-sqlite --help 2>&1 | Select-Object -First 5"
if %ERRORLEVEL% EQU 0 (echo SUCCESS) else (echo FAILED)
echo.

echo [7/10] Testing Puppeteer MCP...
powershell.exe -NoProfile -Command "npx -y @modelcontextprotocol/server-puppeteer --help 2>&1 | Select-Object -First 5"
if %ERRORLEVEL% EQU 0 (echo SUCCESS) else (echo FAILED)
echo.

echo [8/10] Testing Desktop Commander MCP...
powershell.exe -NoProfile -Command "npx -y @wonderwhy-er/desktop-commander --help 2>&1 | Select-Object -First 5"
if %ERRORLEVEL% EQU 0 (echo SUCCESS) else (echo FAILED)
echo.

echo [9/10] Testing @21st-dev/magic MCP...
powershell.exe -NoProfile -Command "npx -y @21st-dev/magic@latest --help 2>&1 | Select-Object -First 5"
if %ERRORLEVEL% EQU 0 (echo SUCCESS) else (echo FAILED)
echo.

echo [10/10] Testing Sequential Thinking MCP...
powershell.exe -NoProfile -Command "npx -y @modelcontextprotocol/server-sequential-thinking --help 2>&1 | Select-Object -First 5"
if %ERRORLEVEL% EQU 0 (echo SUCCESS) else (echo FAILED)
echo.

echo ================================================
echo Test completed!
echo ================================================
echo.
echo Next steps:
echo 1. Restart Claude Desktop completely (close all windows)
echo 2. Start Claude Code again
echo 3. Run /mcp to check if servers are loaded
echo.
pause