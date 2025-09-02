@echo off
setlocal enabledelayedexpansion
title VetMobil Deploy
cd /d "%~dp0"
if not exist ".git" ( echo [EROARE] Nu gasesc .git in %cd% & pause & exit /b 1 )

git config --global core.editor notepad >nul 2>&1

echo.
echo =================================
echo   VetMobil - Staging -> (Live?)
echo =================================
echo.

:: ---------- STAGING (develop) ----------
echo === STAGING: develop ===
git checkout develop || goto :ERR

:: vezi dacă ai modificări locale
set "CHANGED="
for /f "delims=" %%s in ('git status --porcelain') do set CHANGED=1

if defined CHANGED (
  echo.
  echo Ai modificari locale necomise.
  set "ACTIUNE="
  set /p ACTIUNE=Commit (C), Stash (S) sau Abandon (A)? [C/S/A]: 
  if /i "%ACTIUNE%"=="A" goto :END

  if /i "%ACTIUNE%"=="S" (
    git stash push -u -m "vetmobil-deploy auto-stash" || goto :ERR
    set "STASHED=1"
  ) else (
    :: Commit acum
    set "MSG="
    set /p MSG=Mesaj commit (Enter = 'WIP'): 
    if "%MSG%"=="" set "MSG=WIP"
    git add -A || goto :ERR
    git commit -m "%MSG%" || goto :ERR
  )
)

:: adu upstream
git pull --rebase origin develop || goto :ERR

:: daca am facut stash, pune la loc (poate cere rezolvare conflicte)
if defined STASHED (
  echo Aplica stash inapoi...
  git stash pop || goto :ERR
  :: daca pop a adus schimbari, oferim commit rapid
  set "LEFT="
  for /f "delims=" %%s in ('git status --porcelain') do set LEFT=1
  if defined LEFT (
    echo.
    set "MSG2="
    set /p MSG2=Mesaj commit pt schimbarile reaparute (Enter = 'WIP after stash'): 
    if "%MSG2%"=="" set "MSG2=WIP after stash"
    git add -A || goto :ERR
    git commit -m "%MSG2%" || goto :ERR
  )
)

:: push pe develop
git push origin develop || goto :ERR
echo [OK] Staging trimis. Verifica GitHub Actions (staging deploy).

echo.
set "GO_LIVE="
set /p GO_LIVE=Esti multumit cu staging? Trimit pe LIVE acum? (Y/N): 
if /i "%GO_LIVE%"=="Y" goto :LIVE
echo OK, ramanem doar cu staging.
goto :BACK2DEV

:: ---------- LIVE (main) ----------
:LIVE
echo.
echo === LIVE: main (merge din develop) ===
git fetch origin || goto :ERR
git checkout main || goto :ERR
git pull --rebase origin main || goto :ERR
git merge --no-ff --no-edit develop || goto :ERR
git push origin main || goto :ERR
echo [OK] Live trimis. Verifica GitHub Actions (prod deploy).

:BACK2DEV
git checkout develop >nul 2>&1
echo.
echo Gata.
pause
exit /b 0

:ERR
echo.
echo [Eroare] Ultima comanda a esuat. Verifica mesajul de mai sus.
pause
exit /b 1

:END
echo.
echo Gata.
pause
