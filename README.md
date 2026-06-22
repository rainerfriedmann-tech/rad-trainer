# 🚴 Rad-Trainer

Persönlicher KI-Fitnesscoach fürs Rennradtraining. Die App bindet deine
Trainingsdaten von **Strava** an und analysiert sie, um dir individuelle
Empfehlungen zu geben.

Gebaut mit **Next.js (App Router) + TypeScript + Tailwind CSS**.

## Status / Roadmap

- ✅ **Milestone 1 – Projektgerüst + Strava-Anbindung** *(aktuell)*
  - Strava-OAuth-Login (`read`, `activity:read_all`, `profile:read_all`)
  - Verschlüsselte Session (httpOnly-Cookie, AES-256-GCM), automatischer
    Token-Refresh
  - Abruf & Anzeige der letzten Aktivitäten (Distanz, Dauer, Tempo, Höhenmeter,
    Leistung, Puls, Trittfrequenz)
- ✅ **Milestone 2 – Analyse-Dashboard** *(aktuell)*
  - Form-Modell **CTL/ATL/TSB** (Fitness/Ermüdung/Form) als Performance
    Management Chart
  - **TSS-Berechnung** aus Leistung (FTP), Herzfrequenz oder als Dauer-Schätzung
  - **Wochenbelastung** (Zeit, Distanz, Höhenmeter, TSS) als Balkendiagramm
  - **Intensitätsverteilung** über Leistungs-/Pulszonen
  - Hinterlegbare **Trainingswerte** (FTP, max./Schwellen-/Ruhe-HF)
- ✅ **Milestone 3 – KI-Coach** *(aktuell)*
  - Chat-Coach (`/coach`), der deine Analysedaten kennt und Trainings­empfehlungen
    gibt sowie Fragen beantwortet
  - Anbieter wählbar: **Google Gemini** (kostenlos, Standard) oder **Claude**;
    Antworten werden gestreamt
  - Trainingsdaten (CTL/ATL/TSB, Wochenlast, Zonen) werden serverseitig in den
    Kontext injiziert
- ✅ **Milestone 4 – Persistenz** *(aktuell)*
  - **SQLite-kompatible Datenbank** (libSQL) für Tokens, Einstellungen und
    Aktivitäten – lokal als Datei, in der Cloud via Turso (siehe `DEPLOY.md`)
  - Strava-Tokens liegen serverseitig in der DB; das Cookie enthält nur noch die
    (verschlüsselte) Athleten-ID
  - Aktivitäten werden gespeichert und nur bei Veraltung (>15 min) erneut von
    Strava geladen – plus „↻ Aktualisieren"-Button für manuellen Sync

## KI-Coach (Milestone 3)

Unter **„🤖 Coach"** chattest du mit einem Trainingscoach, der über die
Analyse-Pipeline deine echten Strava-Daten der letzten 120 Tage kennt.

Voraussetzung: ein KI-API-Key. Es werden zwei Anbieter unterstützt:

```bash
# in .env.local – empfohlen, da kostenlos:
GEMINI_API_KEY=...          # Key: https://aistudio.google.com/apikey
# optional: GEMINI_MODEL=gemini-2.5-flash

# Alternative (wird nur genutzt, wenn GEMINI_API_KEY leer ist):
# ANTHROPIC_API_KEY=sk-ant-...   # Key: https://console.anthropic.com
```

Ist `GEMINI_API_KEY` gesetzt, läuft der Coach über **Google Gemini** (kostenloser
Tarif), sonst über **Claude**. Ohne Key zeigt die Coach-Seite einen Hinweis statt
des Chats. Die Anfragen laufen serverseitig (`/api/coach`), der Key verlässt den
Server nicht.

Zusätzlich:
- **Chatverlauf bleibt erhalten** (in der DB gespeichert) – beim erneuten Öffnen
  ist das Gespräch wieder da, du kannst darauf aufbauen. „Verlauf löschen" leert ihn.
- **Trainingsplan** hinterlegen (Freitext auf der Coach-Seite): Der Coach gleicht
  deine tatsächlichen Einheiten mit dem Plan ab und weist auf Abweichungen und
  typische Trainingsfehler hin (z. B. zu steiler Lastanstieg, zu viel „graue Zone",
  fehlende Erholung).

## Trainingsmetriken (Milestone 2)

Unter **„📊 Analyse"** (Button im Dashboard) werden deine Aktivitäten der
letzten 120 Tage ausgewertet:

- **TSS (Training Stress Score)** pro Aktivität – aus Leistung
  (`TSS = h · IF² · 100`, `IF = NP/FTP`), ersatzweise aus der Herzfrequenz oder
  als reine Dauer-Schätzung.
- **CTL/ATL/TSB** – 42- bzw. 7-Tage-EWMA der täglichen TSS; TSB („Form") als
  Differenz. Je mehr Historie, desto stabiler die Werte.
- Damit die Berechnung greift, am besten **FTP** und **Herzfrequenz-Werte** im
  Formular oben hinterlegen (FTP wird, falls auf Strava gesetzt, automatisch
  übernommen).

> Hinweis: Strava liefert in der Aktivitätsübersicht nur Durchschnittswerte
> (keine Streams). Power-/HF-basierte Zahlen sind daher konsistente Näherungen
> der streambasierten Werte eines Radcomputers.

## Einrichtung

### 1. Strava-API-App anlegen

1. Öffne <https://www.strava.com/settings/api> und erstelle eine Anwendung.
2. Setze die **Authorization Callback Domain** auf deinen Host — für lokale
   Entwicklung: `localhost`.
3. Notiere dir **Client ID** und **Client Secret**.

### 2. Umgebungsvariablen

```bash
cp .env.local.example .env.local
```

Trage in `.env.local` ein:

- `STRAVA_CLIENT_ID` und `STRAVA_CLIENT_SECRET` aus deiner Strava-App
- `SESSION_SECRET` – ein zufälliger String, z. B. erzeugt mit:

  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

### 3. Starten

```bash
npm install
npm run dev
```

App öffnen unter <http://localhost:3000> und auf **„Mit Strava verbinden"**
klicken.

## Projektstruktur

```
src/
  app/
    page.tsx                        # Startseite (Connect-Screen oder Dashboard)
    layout.tsx
    api/
      auth/strava/route.ts          # OAuth-Start (Redirect zu Strava)
      auth/strava/callback/route.ts # OAuth-Callback (Token-Tausch)
      auth/logout/route.ts          # Session trennen
      activities/route.ts           # Aktivitäten abrufen (mit Token-Refresh)
  components/
    ConnectStrava.tsx               # Verbinden-Screen
    Dashboard.tsx                   # Eingeloggte Ansicht
    ActivityList.tsx                # Aktivitätenliste (Client)
  lib/
    strava.ts                       # Strava-API-Client & OAuth-Helfer
    db.ts                           # libSQL-Verbindung + Schema (Datei oder Turso)
    store.ts                        # DB-Zugriff (Athleten/Tokens, Settings, Aktivitäten)
    sync.ts                         # Aktivitäten von Strava in die DB synchronisieren
    session.ts                      # Session (Athleten-ID im Cookie, Tokens in der DB)
    analysisLoader.ts               # Sync + Analyse aus der DB
    training.ts                     # Trainings-Mathematik (TSS, PMC, Zonen)
    coach.ts                        # System-Prompt & Kontext für den KI-Coach
    gemini.ts                       # Gemini-Streaming (REST) für den Coach
    settings.ts                     # Settings-Typen & Defaults
    url.ts                          # Base-URL / Redirect-URI-Ermittlung
    format.ts                       # Einheiten-Formatierung
```

Lokal liegt die Datenbank standardmäßig als Datei unter `./data/rad-trainer.db`
(per `DATABASE_PATH` konfigurierbar, via `.gitignore` ausgeschlossen). Fürs
Hosting wird stattdessen Turso genutzt (`TURSO_DATABASE_URL` +
`TURSO_AUTH_TOKEN`) – siehe **`DEPLOY.md`** für die kostenlose Einrichtung mit
Vercel + Turso.

## Sicherheitshinweise

- Strava-Tokens werden serverseitig in der Datenbank gespeichert; das
  httpOnly-Cookie enthält nur die verschlüsselte Athleten-ID (AES-256-GCM).
- `SESSION_SECRET`, `ANTHROPIC_API_KEY` und der `TURSO_AUTH_TOKEN` dürfen nicht
  ins Repo gelangen (`.env.local` ist in `.gitignore`).
- Die Datenbank enthält die Strava-Tokens im Klartext – Zugang zur DB-Datei bzw.
  zum Turso-Token entsprechend schützen.
- Für den Produktivbetrieb empfiehlt sich ein fester `APP_URL`.
