# G.A.NewTypeLine

Web app multiplayer per la Timeline di Gundam Assemble. Sprint 1 include React, TypeScript, Vite, Firebase Authentication, predisposizione Firestore, routing protetto e Firebase Hosting.

## Avvio locale

Richiede Node.js 24 o una versione compatibile con Vite 8.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Inserisci nella copia locale di `.env.example` la configurazione della Web App Firebase. Le variabili `VITE_*` sono pubbliche per definizione nel bundle client. Non inserire chiavi di account di servizio o credenziali amministrative.

```bash
npm run lint
npm run typecheck
npm run build
```

## Firebase Console

1. Crea o seleziona il progetto Firebase.
2. Registra una Web App e copia la configurazione nel file `.env.local`.
3. In Authentication abilita i provider **Google** e **Email/Password**.
4. In Authentication aggiungi `localhost` agli Authorized domains per lo sviluppo e il dominio Firebase Hosting dopo il primo rilascio.
5. Crea un database Cloud Firestore in modalità Standard e nella località desiderata. Sprint 1 inizializza solo l'SDK e non legge né scrive dati.
6. Prima dello Sprint 2, definisci e distribuisci Security Rules che limitino ogni accesso ai partecipanti autorizzati e validino le transizioni di stato.

## Hosting e CI

`firebase.json` pubblica `dist` e reindirizza ogni percorso a `index.html`, necessario al routing client-side. Il workflow GitHub Actions esegue `npm ci`, lint, type-check e build sulle pull request e sui branch di sviluppo. Non contiene credenziali e non effettua deploy.

Quando il progetto Firebase sarà selezionato localmente tramite Firebase CLI, il deploy manuale sarà:

```bash
npm run build
npx firebase-tools deploy --only hosting
```

Non eseguire il deploy senza revisione e approvazione esplicita.

## Struttura

- `src/features/auth` contiene lo stato di autenticazione.
- `src/services` contiene l'inizializzazione Firebase, Authentication e il punto di accesso Firestore.
- `src/models` ospita tipi compatibili con gli stati di partita futuri, senza implementare lobby o Timeline.
- `src/pages` e `src/components` separano pagine, layout e protezione delle route.
