# Rad-Trainer im Internet hosten

Die App ist ein Next.js-Server **mit einer SQLite-Datei als Datenbank**. Sie
braucht deshalb einen Host mit **dauerhaftem Speicher (Volume)**. Auf reinen
Serverless-Plattformen (z. B. Vercel) geht die Datenbank bei jedem Neustart
verloren – dort funktioniert die App so nicht.

Empfohlen: **Railway** – komplett über die Weboberfläche, ohne Kommandozeile.
(Kostet aktuell ca. 5 $/Monat nach einem Gratis-Startguthaben. Eine
kostengünstigere, aber technischere Alternative ist Fly.io.)

## Schritt für Schritt mit Railway

### 1. Strava-App vorbereiten
Du brauchst eine Strava-API-App: <https://www.strava.com/settings/api>.
Client ID und Client Secret notieren. Die **Authorization Callback Domain**
trägst du erst in Schritt 6 ein (wenn du die Internet-Adresse kennst).

### 2. Railway-Projekt aus GitHub erstellen
1. Auf <https://railway.app> mit dem GitHub-Konto anmelden.
2. **New Project → Deploy from GitHub repo → `rainerfriedmann-tech/rad-trainer`**.
3. Unter **Settings → Source** als Branch `claude/nice-euler-48wdu1` wählen
   (oder den Branch vorher nach `main` mergen).

Railway erkennt Next.js automatisch und baut die App.

### 3. Speicher-Volume anhängen (wichtig!)
Im Service: **Settings → Volumes → New Volume**, als **Mount path** `/data`
eintragen. Hier wird die Datenbank dauerhaft gespeichert.

### 4. Umgebungsvariablen setzen
Im Service unter **Variables** anlegen:

| Variable | Wert |
| --- | --- |
| `STRAVA_CLIENT_ID` | aus deiner Strava-App |
| `STRAVA_CLIENT_SECRET` | aus deiner Strava-App |
| `SESSION_SECRET` | langer Zufallstext (siehe unten) |
| `DATABASE_PATH` | `/data/rad-trainer.db` |
| `ANTHROPIC_API_KEY` | optional, für den KI-Coach |
| `APP_URL` | trägst du in Schritt 6 ein |

`SESSION_SECRET` erzeugen (lokal im Terminal, oder einen langen zufälligen
Text deiner Wahl, ≥ 32 Zeichen):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Öffentliche Adresse erzeugen
**Settings → Networking → Generate Domain**. Du bekommst eine Adresse wie
`rad-trainer-production.up.railway.app`.

### 6. APP_URL und Strava-Callback eintragen
- In Railway die Variable **`APP_URL`** auf die volle Adresse setzen, z. B.
  `https://rad-trainer-production.up.railway.app` (Railway startet danach neu).
- In den **Strava-API-Einstellungen** die **Authorization Callback Domain** auf
  den Host **ohne `https://`** setzen, z. B.
  `rad-trainer-production.up.railway.app`.

### 7. Fertig
Adresse im Browser öffnen → **„Mit Strava verbinden"**. Deine Daten landen jetzt
dauerhaft im Volume; bei jedem Besuch werden neue Aktivitäten synchronisiert.

## Hinweise
- **Updates ausrollen:** Jeder neue Push auf den gewählten Branch löst auf
  Railway automatisch einen neuen Build aus.
- **Sicherheit:** Die DB-Datei im Volume enthält die Strava-Tokens. Halte den
  Zugang zum Railway-Projekt privat.
- **Andere Hosts:** Jeder Node-Host mit persistentem Volume funktioniert
  (Render mit „Persistent Disk", Fly.io mit „Volumes", eigener Server). Überall
  gilt: `DATABASE_PATH` auf den Volume-Pfad zeigen lassen und `APP_URL` setzen.
