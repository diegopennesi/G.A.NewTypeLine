export const tacticsDeckSize = 9

export const reactionTimings = {
  beforeRoll: 'Prima del tiro', afterRoll: 'Dopo il tiro', damage: 'Danno',
  defeat: 'Prima della sconfitta', movement: 'Fine movimento',
} as const
export type ReactionTiming = keyof typeof reactionTimings
export type TacticsCard = {
  id: string; name: string; text: string; response?: boolean
  kind?: 'attack' | 'command' | 'response'; timing?: ReactionTiming; cost?: number; signature?: string
}
const legacyTacticsCards: readonly TacticsCard[] = [
  { id: 'tactic-01', name: 'Copertura', text: 'Segna che l’unità cerca riparo durante questa azione.' },
  { id: 'tactic-02', name: 'Ricognizione', text: 'Segna che la squadra osserva la zona prima di avanzare.' },
  { id: 'tactic-03', name: 'Spostamento laterale', text: 'Segna una manovra sul fianco.' },
  { id: 'tactic-04', name: 'Distrazione', text: 'Segna un diversivo a favore della squadra.' },
  { id: 'tactic-05', name: 'Raggruppamento', text: 'Segna che la squadra si ricompatta.' },
  { id: 'tactic-06', name: 'Posizione difensiva', text: 'Segna che l’unità presidia la sua posizione.' },
  { id: 'tactic-07', name: 'Supporto', text: 'Segna un intervento di supporto per un’unità alleata.' },
  { id: 'tactic-08', name: 'Retromarcia', text: 'Segna una manovra di ripiegamento.' },
  { id: 'tactic-09', name: 'Avanzata', text: 'Segna una manovra di avanzamento.' },
  { id: 'tactic-10', name: 'Presidio', text: 'Segna un punto che la squadra intende presidiare.' },
  { id: 'tactic-11', response: true, name: 'Cambio di rotta', text: 'Segna un cambio di direzione della squadra.' },
  { id: 'tactic-12', response: true, name: 'Segnale', text: 'Segna una comunicazione tra unità alleate.' },
] as const

export const tacticsCards: readonly TacticsCard[] = [
  { id: "ST01-T01", name: "Epic Shot", kind: "attack", text: "Attacco con bonus di forza per gli alleati vicini. Il critico aggiunge 2 danni.", cost: 3, signature: "ST01-U001" },
  { id: "ST01-T02", name: "Sacrificial Overload", kind: "response", text: "Se Wing Gundam Zero ha attaccato, infligge 2 danni a sé e a ogni bersaglio.", timing: "damage", response: true, signature: "ST01-U002" },
  { id: "ST01-T03", name: "Iron-Blooded Tenacity", kind: "response", text: "Barbatos evita la sconfitta, resta a 1 HP, si muove di 2 e usa Rex Claws a 0 TL.", timing: "defeat", response: true, signature: "ST01-U003" },
  { id: "ST01-T04", name: "Armor Shatter", kind: "command", text: "Applica Fracture a un nemico adiacente." },
  { id: "ST01-T05", name: "Field Engineers", kind: "command", text: "Ripara 4 danni all’unità attiva." },
  { id: "ST01-T06", name: "Hero’s Might", kind: "command", text: "Dopo almeno tre salvataggi di Garrisons, assegna 2 Energy all’unità attiva." },
  { id: "ST01-T07", name: "Thrust Boosters", kind: "command", text: "Assegna un upgrade Speed all’unità attiva." },
  { id: "ST01-T08", name: "Breaking Blow", kind: "response", text: "L’attaccante guadagna 2 Strength e rimuove un upgrade da ciascun bersaglio.", timing: "beforeRoll", response: true },
  { id: "ST01-T09", name: "Quick Block", kind: "response", text: "Riduce di 3 il danno al difensore.", timing: "afterRoll", response: true },
  { id: "ST01-T10", name: "Crimson Execution", kind: "command", text: "Char effettua un Dash e un attacco Heat Hawk aggiuntivi a 0 TL.", signature: "ST01-U004" },
  { id: "ST01-T11", name: "War Edge", kind: "attack", text: "Attacco ad area. Il critico aggiunge 1 danno.", cost: 3, signature: "ST01-U005" },
  { id: "ST01-T12", name: "Claiming Vengeance", kind: "attack", text: "Può catturare un obiettivo presso il bersaglio dopo il tiro. Il critico applica Disarm.", cost: 2, signature: "ST01-U006" },
  { id: "ST01-T13", name: "Armor Upgrade", kind: "command", text: "Assegna un upgrade Shield all’unità attiva." },
  { id: "ST01-T14", name: "Ghost Step", kind: "command", text: "L’unità attiva si muove di 2 esagoni." },
  { id: "ST01-T15", name: "Renewed Power", kind: "command", text: "Assegna un upgrade Strength all’unità attiva." },
  { id: "ST01-T16", name: "Limiter Release", kind: "response", text: "L’attaccante guadagna 3 Strength per questo attacco.", timing: "beforeRoll", response: true },
  { id: "ST01-T17", name: "Neutralize", kind: "response", text: "Riduce di 2 il danno al difensore e rimuove un upgrade dall’attaccante.", timing: "beforeRoll", response: true },
  { id: "ST01-T18", name: "Strikethrough", kind: "response", text: "Aggiunge 1 danno all’attacco.", timing: "afterRoll", response: true },
  { id: "EX01-T01", name: "Psycho-Frame Overload", kind: "command", text: "Unicorn infligge danni pari ai suoi upgrade a un nemico entro gittata 2.", signature: "EX01-U01" },
  { id: "EX01-T02", name: "Critical Rescue", kind: "command", text: "Torohachi si muove di 5 e salva i Garrisons alleati a cui è passato accanto.", signature: "EX01-U02" },
  { id: "EX01-T03", name: "Swift Appropriation", kind: "command", text: "Delta Plus sottrae 1 Energy e un upgrade a un’unità entro gittata 3.", signature: "EX01-U03" },
  { id: "EX01-T04", name: "Full System Burn", kind: "command", text: "L’unità Londo Bell attiva guadagna 3 Speed e Hover per l’attivazione." },
  { id: "EX01-T05", name: "On-Site Integration", kind: "command", text: "Assegna all’unità attiva un upgrade a scelta." },
  { id: "EX01-T06", name: "Salvage Systems", kind: "command", text: "Ripara 3 danni. Se l’unità attiva torna a HP pieni, guadagna 1 Energy." },
  { id: "EX01-T07", name: "Special OPs", kind: "command", text: "Assegna upgrade diversi a un massimo di tre unità Londo Bell schierate." },
  { id: "EX01-T08", name: "Target Reacquisition", kind: "response", text: "Ritira i mancati colpi scelti. Se ne ritiri almeno tre, pesca una carta.", timing: "afterRoll", response: true },
  { id: "EX01-T09", name: "Grunt’s Guard", kind: "response", text: "Riduce di 4 il danno a un difensore che vale meno VP dell’attaccante.", timing: "afterRoll", response: true },
  { id: "EX02-T01", name: "Bit Assault", kind: "command", text: "Aerial riposiziona gli RWS. Ognuno infligge 1 danno a un nemico adiacente.", signature: "EX02-U01" },
  { id: "EX02-T02", name: "Cold Silence", kind: "command", text: "Avanza di 1 TL i nemici adiacenti al Corax di Pharact.", signature: "EX02-U02" },
  { id: "EX02-T03", name: "Iśvara Assault", kind: "command", text: "Darilbalde si riposiziona accanto al suo Iśvara e ottiene +2 danni agli attacchi.", signature: "EX02-U03" },
  { id: "EX02-T04", name: "Dismantle", kind: "command", text: "Rimuove tutti gli upgrade di un nemico adiacente a un RWS alleato." },
  { id: "EX02-T05", name: "Drone Assault", kind: "command", text: "Ogni RWS alleato infligge 1 danno a un nemico adiacente." },
  { id: "EX02-T06", name: "Interference Pattern", kind: "command", text: "L’unità Asticassia attiva applica Disarm ai nemici entro gittata 3." },
  { id: "EX02-T07", name: "BIT Shield", kind: "response", text: "Riduce di 3 il danno al difensore e di 1 ulteriore per ogni RWS alleato entro gittata 2.", timing: "afterRoll", response: true },
  { id: "EX02-T08", name: "Linked Strike", kind: "response", text: "L’attaccante guadagna 3 Strength più 1 per ogni RWS alleato adiacente al bersaglio.", timing: "beforeRoll", response: true },
  { id: "EX02-T09", name: "Interception", kind: "response", text: "Un alleato usa Challenge per difendere al posto di un alleato vicino.", timing: "beforeRoll", response: true },
  { id: "PA01-T01", name: "Protective Shot", kind: "response", text: "Gundam risponde con Beam Rifle a 1 TL quando un nemico termina il movimento entro gittata 3.", timing: "movement", response: true, signature: "PA01-U01" },
  { id: "PA01-T02", name: "All In", kind: "command", text: "Guncannon effettua un attacco aggiuntivo col cannone a 0 TL.", signature: "PA01-U02" },
  { id: "PA01-T03", name: "Bulwark Siege", kind: "command", text: "Guntank si muove di 2 e applica Fracture ai nemici entro gittata 2.", signature: "PA01-U03" },
  { id: "PA01-T04", name: "Formative Strength", kind: "response", text: "Se l’attaccante è vicino a un alleato, guadagna 2 Accuracy e 2 Strength.", timing: "beforeRoll", response: true },
  { id: "PA01-T05", name: "Sayla’s Encouragement", kind: "response", text: "Un alleato che ha subito danno guadagna 2 Energy.", timing: "damage", response: true },
  { id: "PA01-T06", name: "Breaker Sweep", kind: "command", text: "Rimuove fino a due upgrade da un nemico entro gittata 2." },
  { id: "PA01-T07", name: "Systematic Elimination", kind: "command", text: "Prima del tiro, +4 Strength se hai sconfitto almeno tre Garrisons." },
  { id: "PA01-T08", name: "Counter Attack", kind: "response", text: "Un difensore alleato sopravvissuto contrattacca. Applica manualmente la modifica TL indicata sulla carta.", timing: "damage", response: true },
  { id: "PA01-T09", name: "Interference", kind: "response", text: "L’attaccante perde 2 Accuracy per questo attacco.", timing: "beforeRoll", response: true },
]

export const allTacticsCards = [...tacticsCards, ...legacyTacticsCards]

export function canPlayTacticsCard(
  card: TacticsCard,
  ownTurn: boolean,
  paid: boolean,
  reaction: ReactionTiming | null | undefined,
  activeUnitId: string,
  squad: string[],
) {
  if (!card.kind) return ownTurn || !!card.response
  if (card.kind === 'response') {
    return reaction === card.timing && (!card.signature || squad.includes(card.signature))
  }
  return ownTurn && (!reaction || card.id === 'PA01-T07' && reaction === 'beforeRoll') &&
    (card.kind !== 'attack' || !paid) && (!card.signature || card.signature === activeUnitId)
}
