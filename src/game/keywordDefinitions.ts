import { getActiveLocale } from '../i18n/runtime';
import type { Locale } from '../i18n/messages';
import type { CardDefinition } from './types';

export interface KeywordDefinition {
  id: string;
  label: string;
  shortDescription: string;
  fullDescription: string;
}

type KeywordCopy = readonly [id: string, label: string, deShort: string, deFull: string, enShort: string, enFull: string, nlShort: string, nlFull: string];

const copy: KeywordCopy[] = [
  ['compute', 'COMPUTE', 'Ressource zum Ausspielen von Karten.', 'Compute bezahlst du, um Karten auszuspielen und Aktionen wie DEBUG zu verwenden. Zu Beginn deines Zuges wird dein reguläres Compute aufgefüllt.', 'Resource used to play cards.', 'Spend Compute to play cards and use actions such as DEBUG. Your regular Compute refills at the start of your turn.', 'Middel waarmee je kaarten speelt.', 'Besteed Compute om kaarten te spelen en acties zoals DEBUG te gebruiken. Aan het begin van je beurt wordt je gewone Compute aangevuld.'],
  ['power', 'POWER', 'Angriffskraft eines Services.', 'Power bestimmt, wie viel Schaden ein Service bei einem Angriff verursacht.', 'Attack strength of a service.', 'Power determines how much damage a service deals when attacking.', 'Aanvalskracht van een service.', 'Power bepaalt hoeveel schade een service met een aanval toebrengt.'],
  ['integrity', 'INTEGRITY', 'Lebenspunkte einer Karte oder des Cores.', 'Sinkt die Integrity eines Services oder einer Infrastructure auf 0, wird die Karte zerstört. Bei 0 Core-Integrity ist das Match verloren.', 'Health of a card or the Core.', 'A service or Infrastructure is destroyed when its Integrity reaches 0. You lose the match when Core Integrity reaches 0.', 'Levenspunten van een kaart of de Core.', 'Een service of Infrastructure wordt vernietigd als de Integrity 0 bereikt. Bij 0 Core-Integrity verlies je de match.'],
  ['service', 'SERVICE', 'Kämpfende Karte mit Power und Integrity.', 'Services werden auf dem Board ausgespielt. Sie können ab deinem nächsten Zug angreifen und dabei Services, Infrastructure oder den Core als Ziel wählen.', 'Combat card with Power and Integrity.', 'Services are played onto the board. Starting on your next turn, they can attack services, Infrastructure, or the Core.', 'Gevechtskaart met Power en Integrity.', 'Services worden op het bord gespeeld. Vanaf je volgende beurt kunnen ze services, Infrastructure of de Core aanvallen.'],
  ['command', 'COMMAND', 'Einmaliger Effekt, danach landet die Karte im Trash.', 'Commands führen ihren Kartentext einmal aus und werden anschließend in den Trash gelegt.', 'One-time effect that then goes to the Trash.', 'Commands resolve their card text once and are then placed in the Trash.', 'Eenmalig effect dat daarna naar de Trash gaat.', 'Commands voeren hun kaarttekst eenmaal uit en worden daarna in de Trash gelegd.'],
  ['infrastructure', 'INFRASTRUCTURE', 'Dauerhafte Systemkarte auf dem Board.', 'Infrastructure bleibt nach dem Ausspielen aktiv, bis sie zerstört wird. Jede Seite besitzt zwei Infrastructure-Slots.', 'Persistent system card on the board.', 'Infrastructure remains active after being played until it is destroyed. Each side has two Infrastructure slots.', 'Blijvende systeemkaart op het bord.', 'Infrastructure blijft na het spelen actief totdat ze wordt vernietigd. Elke zijde heeft twee Infrastructure-plekken.'],
  ['deploy', 'DEPLOY', 'Effekt beim normalen Ausspielen einer Karte.', 'DEPLOY wird ausgelöst, wenn du die Karte aus deiner Hand ausspielst. Durch FORK erzeugte Kopien lösen DEPLOY normalerweise nicht erneut aus.', 'Effect triggered when a card is played normally.', 'DEPLOY triggers when you play the card from your hand. Copies created by FORK normally do not trigger DEPLOY again.', 'Effect wanneer een kaart normaal wordt gespeeld.', 'DEPLOY wordt geactiveerd wanneer je de kaart uit je hand speelt. Kopieën van FORK activeren DEPLOY normaal niet opnieuw.'],
  ['crash', 'CRASH', 'Effekt beim Zerstören einer Karte.', 'CRASH wird ausgelöst, nachdem der Service zerstört und vom Board entfernt wurde.', 'Effect triggered when a card is destroyed.', 'CRASH triggers after the service is destroyed and removed from the board.', 'Effect wanneer een kaart wordt vernietigd.', 'CRASH wordt geactiveerd nadat de service is vernietigd en van het bord is verwijderd.'],
  ['firewall', 'FIREWALL', 'Schützt deinen Core vor direkten Service-Angriffen.', 'Solange mindestens ein eigener FIREWALL-Service aktiv ist, kann dein Core nicht direkt von gegnerischen Services angegriffen werden.', 'Protects your Core from direct service attacks.', 'While at least one friendly FIREWALL service is active, enemy services cannot attack your Core directly.', 'Beschermt je Core tegen directe serviceaanvallen.', 'Zolang minstens één eigen FIREWALL-service actief is, kunnen vijandelijke services je Core niet rechtstreeks aanvallen.'],
  ['redundancy', 'REDUNDANCY', 'Verhindert die nächste Schadensinstanz vollständig.', 'REDUNDANCY absorbiert einmalig den gesamten Schaden einer Schadensinstanz und wird danach entfernt.', 'Completely prevents the next instance of damage.', 'REDUNDANCY absorbs all damage from one damage instance, then is removed.', 'Voorkomt de volgende schade volledig.', 'REDUNDANCY absorbeert eenmaal alle schade van één schadegebeurtenis en wordt daarna verwijderd.'],
  ['patch', 'PATCH', 'Stellt verlorene Integrity wieder her.', 'PATCH heilt die angegebene Menge Integrity, aber niemals über die maximale Integrity des Ziels hinaus.', 'Restores lost Integrity.', 'PATCH restores the stated amount of Integrity, but never beyond the target’s maximum Integrity.', 'Herstelt verloren Integrity.', 'PATCH herstelt de aangegeven hoeveelheid Integrity, maar nooit boven de maximale Integrity van het doel.'],
  ['sandbox', 'SANDBOX', 'Deaktiviert einen Service vorübergehend.', 'Ein Service in der SANDBOX kann in seinem nächsten eigenen Zug nicht angreifen und löst bis dahin keine Effekte aus. Danach endet die SANDBOX.', 'Temporarily disables a service.', 'A service in the SANDBOX cannot attack during its next turn and triggers no effects until then. The SANDBOX then ends.', 'Schakelt een service tijdelijk uit.', 'Een service in de SANDBOX kan tijdens zijn volgende beurt niet aanvallen en activeert tot dan geen effecten. Daarna eindigt de SANDBOX.'],
  ['fork', 'FORK', 'Erzeugt eine Kopie eines Services.', 'FORK kopiert einen Service in einen freien Slot. Die Kopie löst ihren DEPLOY-Effekt normalerweise nicht erneut aus.', 'Creates a copy of a service.', 'FORK copies a service into an open slot. The copy normally does not trigger its DEPLOY effect again.', 'Maakt een kopie van een service.', 'FORK kopieert een service naar een vrije plek. De kopie activeert haar DEPLOY-effect normaal niet opnieuw.'],
  ['overclock', 'OVERCLOCK', 'Zusätzliches Compute für einen stärkeren Effekt.', 'Beim Ausspielen kannst du die angegebenen Mehrkosten bezahlen, um den OVERCLOCK-Bonus zu erhalten.', 'Additional Compute for a stronger effect.', 'When playing the card, you may pay the stated extra cost to receive the OVERCLOCK bonus.', 'Extra Compute voor een sterker effect.', 'Bij het spelen kun je de aangegeven meerkosten betalen om de OVERCLOCK-bonus te krijgen.'],
  ['bug', 'BUG', 'Token-Service mit 0 Power und 1 Integrity.', 'Ein BUG kann nicht angreifen, besitzt keine Effekte und blockiert einen deiner fünf Service-Slots. Mit DEBUG kannst du einen eigenen BUG für 1 Compute entfernen.', 'Token service with 0 Power and 1 Integrity.', 'A BUG cannot attack, has no effects, and occupies one of your five service slots. Use DEBUG to remove a friendly BUG for 1 Compute.', 'Token-service met 0 Power en 1 Integrity.', 'Een BUG kan niet aanvallen, heeft geen effecten en bezet een van je vijf serviceplekken. Met DEBUG verwijder je een eigen BUG voor 1 Compute.'],
  ['child-component', 'CHILD COMPONENT', 'Kleiner, durch Effekte erzeugter Service-Token.', 'Eine CHILD COMPONENT besitzt 1 Power und 1 Integrity. Sie gehört nicht zum Deck und wird nur für das laufende Match erzeugt.', 'Small service token created by effects.', 'A CHILD COMPONENT has 1 Power and 1 Integrity. It is not part of the deck and is only created for the current match.', 'Kleine service-token die door effecten wordt gemaakt.', 'Een CHILD COMPONENT heeft 1 Power en 1 Integrity. Ze hoort niet bij het deck en wordt alleen voor de huidige match gemaakt.'],
  ['replica', 'REPLICA', 'Kleiner, durch Effekte erzeugter Service-Token.', 'Eine REPLICA besitzt 1 Power und 1 Integrity. Sie gehört nicht zum Deck und wird nur für das laufende Match erzeugt.', 'Small service token created by effects.', 'A REPLICA has 1 Power and 1 Integrity. It is not part of the deck and is only created for the current match.', 'Kleine service-token die door effecten wordt gemaakt.', 'Een REPLICA heeft 1 Power en 1 Integrity. Ze hoort niet bij het deck en wordt alleen voor de huidige match gemaakt.'],
];

function description(item: KeywordCopy, locale: Locale, full: boolean): string {
  const offset = locale === 'de' ? 2 : locale === 'en' ? 4 : 6;
  return item[offset + (full ? 1 : 0)];
}

export const keywordDefinitions: KeywordDefinition[] = copy.map((item) => {
  const definition = { id: item[0], label: item[1] } as KeywordDefinition;
  Object.defineProperties(definition, {
    shortDescription: { enumerable: true, get: () => description(item, getActiveLocale(), false) },
    fullDescription: { enumerable: true, get: () => description(item, getActiveLocale(), true) },
  });
  return definition;
});

export const keywordDefinitionByLabel = new Map(
  keywordDefinitions.map((definition) => [definition.label.toLocaleUpperCase('de'), definition]),
);

const keywordLabelsByLength = keywordDefinitions
  .map((definition) => definition.label)
  .sort((left, right) => right.length - left.length);

const escapedLabels = keywordLabelsByLength.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
export const keywordPattern = new RegExp(`(${escapedLabels.join('|')})`, 'gi');

export function definitionsForCard(card: CardDefinition): KeywordDefinition[] {
  const haystack = [card.name, card.text].join(' ').toLocaleUpperCase();
  const ids = new Set<string>();
  const structuralTerms = new Set(['compute', 'power', 'integrity', 'service', 'command', 'infrastructure']);

  for (const keyword of card.keywords ?? []) {
    const definition = keywordDefinitionByLabel.get(keyword.toLocaleUpperCase());
    if (definition) ids.add(definition.id);
  }

  for (const definition of keywordDefinitions) {
    if (!structuralTerms.has(definition.id) && haystack.includes(definition.label)) ids.add(definition.id);
  }

  return keywordDefinitions.filter((definition) => ids.has(definition.id));
}
