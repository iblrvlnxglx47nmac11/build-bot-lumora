@echo off
REM ═══════════════════════════════════════════════════════════════════════
REM LUMORA BOT LAUNCHER - Minimized Mode
REM Run Chrome with bot extension in background (minimized window)
REM ═══════════════════════════════════════════════════════════════════════

echo [Lumora Bot] Starting Chrome in minimized mode...

REM Extension path
set EXTENSION_PATH=%~dp0lumora-ext

REM Chrome executable paths (try common locations)
set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_PATH% set CHROME_PATH="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_PATH% set CHROME_PATH="%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

REM Brave path (alternative)
set BRAVE_PATH="C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"

REM Choose browser
if exist %CHROME_PATH% (
    set BROWSER=%CHROME_PATH%
    echo [Lumora Bot] Using Chrome
) else if exist %BRAVE_PATH% (
    set BROWSER=%BRAVE_PATH%
    echo [Lumora Bot] Using Brave
) else (
    echo [ERROR] Chrome/Brave not found!
    pause
    exit /b 1
)

REM Launch Chrome minimized with extension
start "" /MIN %BROWSER% ^
    --load-extension="%EXTENSION_PATH%" ^
    --disable-extensions-except="%EXTENSION_PATH%" ^
    --user-data-dir="%LOCALAPPDATA%\LumoraBot\Profile" ^
    --no-first-run ^
    --no-default-browser-check ^
    "https://playlumora.io"

echo [Lumora Bot] Chrome launched in background!
echo [Lumora Bot] Window minimized - bot running...
echo.
echo Press any key to open dashboard...
pause > nul

REM Open dashboard
start "" "%~dp0dashboard.html"

echo [Lumora Bot] Dashboard opened!
echo.
echo To stop bot: Close Chrome from taskbar
pause
