# GGA one Team – one Mission (MVP)

**Zweck:** Jahreskalender & Vertretungsplanung für Hebammen (Registrierung, Status a/b/c, Signaturen, Urlaube, Monats-Fallzahlen, Filter, PDF/XLSX, Mobile-Ansicht, blau→rosa Gradient, Blumen-Animation).  
**Hinweis:** Dieses Frontend ist **rein statisch** (LocalStorage). Geplante Automatisierungen (täglicher XLSX-Mailversand, GitHub-Archiv) benötigen ein Backend – siehe `BACKEND_NOTES.md`.

## Schnellstart (lokal)
```bash
npm ci
npm run dev
# öffne http://localhost:5173
```

## Produktion (GitHub Pages)
1. Repo auf GitHub erstellen und diesen Code pushen.
2. GitHub Pages aktivieren (Settings → Pages → „GitHub Actions“).
3. Workflow läuft automatisch bei Push auf `main` und veröffentlicht `dist/`.
4. Falls du einen anderen Branch oder Ordner nutzt, passe `.github/workflows/deploy.yml` an.

> Vite ist auf **relative Pfade** (`base: './'`) konfiguriert – damit läuft es out-of-the-box auf Pages.

## Features
- Registrierung/Login (Demo, LocalStorage), Username = Signatur
- Jahrsauswahl (2025+), Tagesstatus: **a) abwesend** (exklusiv), **b) verfügbar**, **c) bereit für Vertretung** (b & c kombinierbar)
- Signaturen anderer Hebammen auf Abwesenheitstagen
- Urlaube (markieren Tage automatisch als abwesend)
- Monatliche Fallzahlen je Hebamme (schwanger/entbunden)
- Filter (persistiert), Reset-Button
- PDF/XLSX-Export (Client)
- Mobile/Desk­top Toggle, Blumen-Emojis

## Grenzen des MVP
- Keine echte Auth/DB. Jeder Browser hat eigene LocalStorage-Daten.
- Kein serverseitiges Backup/Restore, keine E-Mails – siehe Backend-Notizen.

## Lizenz
MIT
