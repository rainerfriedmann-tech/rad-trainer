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
- ⬜ **Milestone 3 – KI-Coach mit Claude** (Trainingsempfehlungen & Q&A auf Basis
  deiner Daten)
- ⬜ **Milestone 4 – Persistenz** (Datenbank statt nur On-Demand-Abruf)

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
    session.ts                      # Verschlüsselte Session + Token-Refresh
    url.ts                          # Base-URL / Redirect-URI-Ermittlung
    format.ts                       # Einheiten-Formatierung
```

## Sicherheitshinweise

- Strava-Tokens liegen verschlüsselt in einem httpOnly-Cookie; sie sind für
  JavaScript im Browser nicht lesbar.
- `SESSION_SECRET` darf nicht ins Repo gelangen (`.env.local` ist in
  `.gitignore`).
- Für den Produktivbetrieb sollte ein dauerhafter Speicher (DB) sowie ein
  fester `APP_URL` konfiguriert werden.
