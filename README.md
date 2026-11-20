# G.A.NewTypeLine

Web app multiplayer per la Timeline di Gundam Assemble, con autenticazione Firebase, lobby private e preparazione delle squadre.

## Sprint 3: preparazione partita

Scegli 3v3 o 5v5 alla creazione, invita il secondo giocatore tramite codice o QR e componi una squadra scegliendo tra 6 Unit Card dello Starter Set e 12 segnaposto. I colori sono casuali; non determinano l’iniziativa. Ogni giocatore conferma la propria squadra; quando entrambi sono pronti viene mostrata la Timeline iniziale di 10 caselle. Le conferme sono persistenti e sincronizzate. Le selezioni non ancora confermate sono bozze locali.

Le sei Unit Card ST01 usano la TL iniziale stampata. Puoi selezionare un’arma per precompilare il costo TL dell’azione. Le altre unità usano valori provvisori. L’ordine di selezione determina l’ordine iniziale delle proprie unità sulla stessa casella. In partita l’app evidenzia il prossimo MS. Il suo giocatore avvia l’attivazione, paga il costo TL e conclude l’attivazione al termine delle azioni. I comandi **Distrutto (+2 TL)** e **Spostamento da effetto** permettono di registrare effetti anche su altri MS. Il combattimento, il punteggio e gli inneschi delle carte si risolvono al tavolo.

### Carte e mazzi

- **Unit Card**. Le carte delle unità schierate sulla Timeline. Ogni giocatore ne sceglie 3 o 5 in base al formato.
- **Tactics Card**. Le carte del mazzo tattico. In lobby ogni giocatore sceglie e salva privatamente 9 carte segnaposto, sia in 3v3 sia in 5v5. In partita, gioca una carta durante un’attivazione. Il quadratino resta sulla TL di origine dell’attivazione e apre il testo della carta. Una Response può essere registrata anche durante l’attivazione avversaria quando si verifica l’innesco. **Revert** rimuove il tuo ultimo quadratino e rende nuovamente disponibile la relativa carta.

### Riprendere una partita

Dalla dashboard, **Riprendi partita** mostra le lobby e le partite dell’account, con l’ultima mossa in GMT quando disponibile. Dopo un’ora di inattività la voce scompare dalla dashboard e l’app blocca il rientro. In una partita avviata l’ora parte dall’avvio e riparte a ogni spostamento di una Unit Card, giocata tattica o Revert. In preparazione conta l’ultimo aggiornamento della lobby.

Firestore salva `lastActionAt` usando l’orologio del server. Per le partite precedenti usa `updatedAt` come riferimento. Lo stato salvato rimane disponibile per consultare l’esito della scadenza, che viene calcolato al momento dell’accesso. Le regole bloccano nuove azioni dopo la scadenza. Lo storico completo delle mosse è ancora da implementare.

### Pulizia settimanale

La Cloud Function `cleanupExpiredGames` gira ogni lunedì alle 09:00 GMT. Elimina le partite e le sottocollezioni con ultima attività pari o precedente all’orario pianificato meno 8 giorni. Per una partita senza mosse conta l’ultimo aggiornamento della lobby. Ad esempio, lunedì 14 alle 09:00 la soglia è domenica 6 alle 09:00 GMT, inclusa.

La CI parte quando si apre o aggiorna una pull request. **Deploy Firebase** pubblica Hosting e regole Firestore quando la PR viene unita in `main`. Per pubblicare la funzione, dopo il deploy delle regole avvia manualmente **Deploy Weekly Cleanup** da GitHub Actions sul branch `main`. Il progetto deve avere il piano Blaze, le API necessarie abilitate e un’identità di deploy con i permessi per Cloud Functions di seconda generazione e Cloud Scheduler.

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
