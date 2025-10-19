@echo off
echo Testing Next.js server connectivity...
echo.

echo Testing port 3000...
curl -s -o nul -w "Port 3000: %%{http_code}\n" http://localhost:3000 2>nul

echo Testing port 3001...
curl -s -o nul -w "Port 3001: %%{http_code}\n" http://localhost:3001 2>nul

echo Testing port 3002...
curl -s -o nul -w "Port 3002: %%{http_code}\n" http://localhost:3002 2>nul

echo.
echo If you see "200" next to a port, that's your working server!
echo Open your browser to that port (e.g., http://localhost:3000)
echo.

pause

