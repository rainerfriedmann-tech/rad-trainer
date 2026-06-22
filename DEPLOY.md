# Rad-Trainer kostenlos im Internet hosten (Vercel + Turso)

Die App läuft kostenlos und dauerhaft mit:

- **Vercel** – hostet die Next.js-App (Gratis-Tarif „Hobby").
- **Turso** – SQLite-kompatible Cloud-Datenbank (Gratis-Tarif), damit die Daten
  dauerhaft gespeichert bleiben.

Beides wird über die Weboberfläche eingerichtet, ohne Kommandozeile.

Lokal (auf deinem Rechner) brauchst du **kein** Turso – dort nutzt die App
automatisch eine Datei. Turso ist nur fürs Hosting nötig.

---

## Teil 1 — Datenbank bei Turso anlegen

1. Auf <https://turso.tech> kostenlos registrieren (geht mit GitHub).
2. Im Dashboard eine **neue Datenbank** erstellen (Name z. B. `rad-trainer`).
3. Die **Database-URL** kopieren – sie sieht so aus:
   `libsql://rad-trainer-deinname.turso.io`
4. Einen **Auth-Token** für die Datenbank erzeugen („Create Token") und kopieren.

Diese beiden Werte brauchst du gleich.

## Teil 2 — App bei Vercel deployen

1. Auf <https://vercel.com> mit dem GitHub-Konto anmelden.
2. **Add New… → Project** → das Repo `rainerfriedmann-tech/rad-trainer`
   importieren. Als Branch `claude/nice-euler-48wdu1` wählen (oder vorher nach
   `main` mergen).
3. Vor dem ersten Deploy unter **Environment Variables** eintragen:

   | Variable | Wert |
   | --- | --- |
   | `STRAVA_CLIENT_ID` | aus deiner Strava-App |
   | `STRAVA_CLIENT_SECRET` | aus deiner Strava-App |
   | `SESSION_SECRET` | langer Zufallstext (≥ 32 Zeichen) |
   | `TURSO_DATABASE_URL` | die `libsql://…`-URL aus Teil 1 |
   | `TURSO_AUTH_TOKEN` | der Token aus Teil 1 |
   | `GEMINI_API_KEY` | optional, für den KI-Coach (kostenlos, aistudio.google.com/apikey) |

   `SESSION_SECRET` erzeugen (oder irgendeinen langen Zufallstext nehmen):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
4. **Deploy** klicken. Du bekommst eine Adresse wie `rad-trainer.vercel.app`.

## Teil 3 — Adresse verknüpfen

1. In Vercel die Variable **`APP_URL`** ergänzen, z. B.
   `https://rad-trainer.vercel.app` → danach unter **Deployments** neu deployen
   („Redeploy"), damit die Variable greift.
2. In den **Strava-API-Einstellungen** (<https://www.strava.com/settings/api>)
   die **Authorization Callback Domain** auf den Host **ohne `https://`** setzen,
   z. B. `rad-trainer.vercel.app`.

## Fertig

Adresse öffnen → **„Mit Strava verbinden"**. Deine Aktivitäten landen jetzt
dauerhaft in der Turso-Datenbank.

---

## Hinweise
- **Updates:** Jeder Push auf den gewählten Branch deployt Vercel automatisch neu.
- **Coach-Antwortzeit:** Auf dem Gratis-Tarif sind Server-Antworten auf 60 s
  begrenzt. Sehr lange Coach-Antworten könnten in seltenen Fällen abbrechen –
  für normale Fragen reicht es problemlos.
- **Strava-Limits:** Die App synchronisiert höchstens alle 15 Minuten; das bleibt
  klar innerhalb der kostenlosen Strava-API-Limits.
- **Anderer Gratis-Weg:** Statt Vercel geht auch jeder Node-Host – mit Turso als
  DB bleibt die Konfiguration dieselbe (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`,
  `APP_URL`).
