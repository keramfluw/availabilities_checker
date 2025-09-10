# BACKEND-NOTES (Skizze für Produktion)

**Empfehlung:** Next.js + Supabase (Postgres, Auth, RLS) + Vercel + SendGrid + GitHub API (Octokit).

## Tabellen (Auszug)
- `profiles(user_id, username unique, color)`
- `availability(user_id, date, available, ready, absent)` (CHECK: not (absent and (available or ready)))
- `signatures(absent_user_id, date, signer_user_id)`
- `vacations(user_id, start_date, end_date)`
- `monthly_loads(user_id, year, month, pregnant, postpartum)`
- `user_settings(user_id, filters jsonb)`

**RLS:** Alle lesen, nur Owner schreibt (für Signaturen: alle dürfen insert für fremde Abwesenheit).

## API-Routen (Next.js /api)
- `POST /api/availability` – upsert Tagesstatus (nur self)
- `POST /api/vacations` – Zeitraum anlegen, Tage serverseitig auf absent setzen
- `POST /api/sign` – Signatur für fremden Abwesenheitstag
- `GET  /api/overview?year=YYYY` – Aggregat fürs Frontend
- `GET  /api/export/xlsx?year=YYYY` – XLSX-Export (gleiches Schema wie Client-Export)
- `POST /api/backup/restore` – XLSX einspielen (Admin)

## Cron-Backup
- Vercel-Cron ruft täglich `/api/cron/daily-export` mit Secret auf.
- Route erzeugt XLSX (SheetJS), versendet via SendGrid und pusht nach GitHub (`archives/`).
- E-Mail-Empfänger z. B. `marek.wulff@t-online.de` (korrekte Domain verwenden).

## DSGVO & Sicherheit
- Keine Patient:innendaten; nur Verfügbarkeiten und aggregierte Fallzahlen.
- TLS, Encryption-at-rest, 2FA; Service-Keys strikt nur serverseitig.
- Optionale PGP-Verschlüsselung für Mail-Backups oder Verwendung signierter Download-Links.
