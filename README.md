# G.A.NewTypeLine

Web app multiplayer per la Timeline di Gundam Assemble, con autenticazione Firebase, lobby private e preparazione delle squadre.

## Sprint 3: preparazione partita

Scegli 3v3 o 5v5 alla creazione, invita il secondo giocatore tramite codice o QR e componi una squadra scegliendo tra 18 carte placeholder. I colori sono casuali; non determinano l’iniziativa. Ogni giocatore conferma la propria squadra; quando entrambi sono pronti viene mostrata la Timeline iniziale di 10 caselle. Le conferme sono persistenti e sincronizzate. Le selezioni non ancora confermate sono bozze locali.

I valori delle carte sono provvisori. L’ordine di selezione determina l’ordine delle proprie unità sulla stessa casella. Attivazioni, spareggio iniziale, combattimento e avanzamento delle fasi non sono ancora implementati. Durante il setup l’uscita libera il posto e azzera le conferme; dopo l’avvio si può tornare alla dashboard senza abbandonare la partita.

### Test locali delle regole e dei servizi

Installa Java 21 e usa Node.js 24, poi esegui `npm run test:rules`. Il comando avvia Firestore Emulator con il progetto fittizio `demo-ganewtypeline`: non richiede login e non modifica il database online. La prima esecuzione scarica Firebase CLI ed emulatore.

I test coprono conferme simultanee 3v3/5v5, persistenza e sottoscrizioni, ingresso ripetuto, uscita e sostituzione, trasferimento della proprietà, cancellazione dell’ultima lobby e rifiuto delle modifiche non autorizzate. Sono eseguiti anche dalla CI.

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
5. Crea un database Cloud Firestore in modalità Standard e nella località desiderata. Le lobby e le squadre vengono salvate nella collezione games.
6. Distribuisci le Security Rules incluse insieme alla versione dell’app. Le lobby delle versioni precedenti prive dei campi di setup vanno ricreate.

## Hosting e CI

`firebase.json` pubblica `dist` e reindirizza ogni percorso a `index.html`, necessario al routing client-side. Il workflow GitHub Actions esegue `npm ci`, lint, type-check e build sulle pull request e sui branch di sviluppo. Il workflow separato Deploy Firebase pubblica Hosting e regole Firestore su push a main, usando i secret dell’environment GATypeLine.

Quando il progetto Firebase sarà selezionato localmente tramite Firebase CLI, il deploy manuale sarà:

```bash
npm run build
npx firebase-tools deploy --only hosting
```

Non eseguire il deploy senza revisione e approvazione esplicita.

## Struttura

- `src/features/auth` contiene lo stato di autenticazione.
- `src/services` contiene l'inizializzazione Firebase, Authentication e il punto di accesso Firestore.
- `src/models` ospita tipi compatibili con gli stati di partita futuri, incluse lobby e squadre.
- `src/pages` e `src/components` separano pagine, layout e protezione delle route.
