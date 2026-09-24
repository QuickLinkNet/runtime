import type { CardDefinition } from './types';

export interface KeywordDefinition {
  id: string;
  label: string;
  shortDescription: string;
  fullDescription: string;
}

export const keywordDefinitions: KeywordDefinition[] = [
  {
    id: 'compute',
    label: 'COMPUTE',
    shortDescription: 'Ressource zum Ausspielen von Karten.',
    fullDescription: 'Compute bezahlst du, um Karten auszuspielen und Aktionen wie DEBUG zu verwenden. Zu Beginn deines Zuges wird dein reguläres Compute aufgefüllt.',
  },
  {
    id: 'power',
    label: 'POWER',
    shortDescription: 'Angriffskraft eines Services.',
    fullDescription: 'Power bestimmt, wie viel Schaden ein Service bei einem Angriff verursacht.',
  },
  {
    id: 'integrity',
    label: 'INTEGRITY',
    shortDescription: 'Lebenspunkte einer Karte oder des Cores.',
    fullDescription: 'Sinkt die Integrity eines Services oder einer Infrastructure auf 0, wird die Karte zerstört. Bei 0 Core-Integrity ist das Match verloren.',
  },
  {
    id: 'service',
    label: 'SERVICE',
    shortDescription: 'Kämpfende Karte mit Power und Integrity.',
    fullDescription: 'Services werden auf dem Board ausgespielt. Sie können ab deinem nächsten Zug angreifen und dabei Services, Infrastructure oder den Core als Ziel wählen.',
  },
  {
    id: 'command',
    label: 'COMMAND',
    shortDescription: 'Einmaliger Effekt, danach landet die Karte im Trash.',
    fullDescription: 'Commands führen ihren Kartentext einmal aus und werden anschließend in den Trash gelegt.',
  },
  {
    id: 'infrastructure',
    label: 'INFRASTRUCTURE',
    shortDescription: 'Dauerhafte Systemkarte auf dem Board.',
    fullDescription: 'Infrastructure bleibt nach dem Ausspielen aktiv, bis sie zerstört wird. Jede Seite besitzt zwei Infrastructure-Slots.',
  },
  {
    id: 'deploy',
    label: 'DEPLOY',
    shortDescription: 'Effekt beim normalen Ausspielen einer Karte.',
    fullDescription: 'DEPLOY wird ausgelöst, wenn du die Karte aus deiner Hand ausspielst. Durch FORK erzeugte Kopien lösen DEPLOY normalerweise nicht erneut aus.',
  },
  {
    id: 'crash',
    label: 'CRASH',
    shortDescription: 'Effekt beim Zerstören einer Karte.',
    fullDescription: 'CRASH wird ausgelöst, nachdem der Service zerstört und vom Board entfernt wurde.',
  },
  {
    id: 'firewall',
    label: 'FIREWALL',
    shortDescription: 'Schützt deinen Core vor direkten Service-Angriffen.',
    fullDescription: 'Solange mindestens ein eigener FIREWALL-Service aktiv ist, kann dein Core nicht direkt von gegnerischen Services angegriffen werden.',
  },
  {
    id: 'redundancy',
    label: 'REDUNDANCY',
    shortDescription: 'Verhindert die nächste Schadensinstanz vollständig.',
    fullDescription: 'REDUNDANCY absorbiert einmalig den gesamten Schaden einer Schadensinstanz und wird danach entfernt.',
  },
  {
    id: 'patch',
    label: 'PATCH',
    shortDescription: 'Stellt verlorene Integrity wieder her.',
    fullDescription: 'PATCH heilt die angegebene Menge Integrity, aber niemals über die maximale Integrity des Ziels hinaus.',
  },
  {
    id: 'sandbox',
    label: 'SANDBOX',
    shortDescription: 'Deaktiviert einen Service vorübergehend.',
    fullDescription: 'Ein Service in der SANDBOX kann nicht angreifen und löst keine Effekte aus. Die SANDBOX endet zu Beginn des nächsten eigenen Zuges seines Besitzers.',
  },
  {
    id: 'fork',
    label: 'FORK',
    shortDescription: 'Erzeugt eine Kopie eines Services.',
    fullDescription: 'FORK kopiert einen Service in einen freien Slot. Die Kopie löst ihren DEPLOY-Effekt normalerweise nicht erneut aus.',
  },
  {
    id: 'overclock',
    label: 'OVERCLOCK',
    shortDescription: 'Zusätzliches Compute für einen stärkeren Effekt.',
    fullDescription: 'Beim Ausspielen kannst du die angegebenen Mehrkosten bezahlen, um den OVERCLOCK-Bonus zu erhalten.',
  },
  {
    id: 'bug',
    label: 'BUG',
    shortDescription: 'Token-Service mit 0 Power und 1 Integrity.',
    fullDescription: 'Ein BUG kann nicht angreifen, besitzt keine Effekte und blockiert einen deiner fünf Service-Slots. Mit DEBUG kannst du einen eigenen BUG für 1 Compute entfernen.',
  },
  {
    id: 'child-component',
    label: 'CHILD COMPONENT',
    shortDescription: 'Kleiner, durch Effekte erzeugter Service-Token.',
    fullDescription: 'Eine CHILD COMPONENT besitzt 1 Power und 1 Integrity. Sie gehört nicht zum Deck und wird nur für das laufende Match erzeugt.',
  },
  {
    id: 'replica',
    label: 'REPLICA',
    shortDescription: 'Kleiner, durch Effekte erzeugter Service-Token.',
    fullDescription: 'Eine REPLICA besitzt 1 Power und 1 Integrity. Sie gehört nicht zum Deck und wird nur für das laufende Match erzeugt.',
  },
];

export const keywordDefinitionByLabel = new Map(
  keywordDefinitions.map((definition) => [definition.label.toLocaleUpperCase('de'), definition]),
);

const keywordLabelsByLength = keywordDefinitions
  .map((definition) => definition.label)
  .sort((left, right) => right.length - left.length);

const escapedLabels = keywordLabelsByLength.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
export const keywordPattern = new RegExp(`(${escapedLabels.join('|')})`, 'gi');

export function definitionsForCard(card: CardDefinition): KeywordDefinition[] {
  const haystack = [card.name, card.text, card.type, ...(card.keywords ?? [])].join(' ').toLocaleUpperCase('de');
  const ids = new Set<string>();

  ids.add('compute');
  ids.add(card.type);
  if (card.power !== undefined) ids.add('power');
  if (card.integrity !== undefined) ids.add('integrity');

  for (const definition of keywordDefinitions) {
    if (haystack.includes(definition.label)) ids.add(definition.id);
  }

  return keywordDefinitions.filter((definition) => ids.has(definition.id));
}
