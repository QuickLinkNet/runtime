import rawProfiles from '../../shared/faction-profiles.json';
import { getActiveLocale } from '../i18n/runtime';
import type { Locale } from '../i18n/messages';
import type { Domain } from './types';

export interface FactionProfile {
  name: string;
  identity: string;
  fantasy: string;
  verbs: string[];
  strengths: string[];
  weaknesses: string[];
  designRule: string;
}

type Faction = Exclude<Domain, 'token'>;
type FactionCopy = Omit<FactionProfile, 'name' | 'verbs'>;

const names: Record<Faction, Record<Locale, string>> = {
  frontend: { de: 'Frontend', en: 'Frontend', nl: 'Frontend' },
  backend: { de: 'Backend', en: 'Backend', nl: 'Backend' },
  infrastructure: { de: 'DevOps', en: 'DevOps', nl: 'DevOps' },
  data: { de: 'Data', en: 'Data', nl: 'Data' },
  security: { de: 'Security', en: 'Security', nl: 'Security' },
  ai: { de: 'AI', en: 'AI', nl: 'AI' },
  neutral: { de: 'Neutral', en: 'Neutral', nl: 'Neutraal' },
};

const copy: Record<Faction, Record<Locale, FactionCopy>> = {
  frontend: {
    de: { identity: 'Tempo & Resilienz', fantasy: 'Baue viele kleine Services, repariere Ausfälle und verwandle BUGs in bessere Interfaces.', strengths: ['Breites frühes Board', 'Schnelle Wiederherstellung', 'Günstige Synergien'], weaknesses: ['Einzelne Services sind fragil', 'Schwächer gegen harte Kontrolle'], designRule: 'Jedes Set sollte mindestens eine günstige DEPLOY-Karte und eine Belohnung für reparierte oder erzeugte Services enthalten.' },
    en: { identity: 'Tempo & Resilience', fantasy: 'Build many small services, repair outages, and turn BUGs into better interfaces.', strengths: ['Wide early board', 'Fast recovery', 'Low-cost synergies'], weaknesses: ['Individual services are fragile', 'Weaker against hard control'], designRule: 'Every set should contain at least one low-cost DEPLOY card and one reward for repaired or created services.' },
    nl: { identity: 'Tempo & veerkracht', fantasy: 'Bouw veel kleine services, herstel uitval en verander BUGs in betere interfaces.', strengths: ['Breed vroeg bord', 'Snel herstel', 'Goedkope synergieën'], weaknesses: ['Afzonderlijke services zijn kwetsbaar', 'Zwakker tegen harde controle'], designRule: 'Elke set hoort minstens één goedkope DEPLOY-kaart en één beloning voor herstelde of gemaakte services te bevatten.' },
  },
  backend: {
    de: { identity: 'Value & Zuverlässigkeit', fantasy: 'Services arbeiten weiter, ziehen Wert aus stabiler Infrastruktur und überstehen lange Matches.', strengths: ['Nachhaltige Karten-Vorteile', 'Stabile Midrange-Services', 'Effiziente Infrastruktur'], weaknesses: ['Träger Start', 'Abhängig von aufgebautem Board'], designRule: 'Neue Backend-Karten sollen Queue, Draw oder Resilienz verbinden – keine reinen Tempo-Kopien des Frontends.' },
    en: { identity: 'Value & Reliability', fantasy: 'Services keep working, gain value from stable infrastructure, and endure long matches.', strengths: ['Sustained card advantage', 'Stable midrange services', 'Efficient infrastructure'], weaknesses: ['Slow start', 'Depends on an established board'], designRule: 'New Backend cards should connect queueing, draw, or resilience—not merely copy Frontend tempo.' },
    nl: { identity: 'Waarde & betrouwbaarheid', fantasy: 'Services blijven werken, halen waarde uit stabiele infrastructuur en doorstaan lange matches.', strengths: ['Duurzaam kaartvoordeel', 'Stabiele midrange-services', 'Efficiënte infrastructuur'], weaknesses: ['Trage start', 'Afhankelijk van een opgebouwd bord'], designRule: 'Nieuwe Backend-kaarten moeten queue, draw of veerkracht verbinden en geen pure tempokopieën van Frontend zijn.' },
  },
  infrastructure: {
    de: { identity: 'Skalierung & Ausfallsicherheit', fantasy: 'Du investierst in dein System, skalierst Services und machst aus CRASHs kontrollierbare Zwischenfälle.', strengths: ['Starkes Mid/Late Game', 'Hohe Service-Qualität', 'Guter Wiederaufbau'], weaknesses: ['Begrenzte Infrastructure-Slots', 'Investition vor Ertrag'], designRule: 'DevOps erhält Belohnungen für mindestens zwei eigene Services oder bewältigte CRASH-Ereignisse.' },
    en: { identity: 'Scaling & Resilience', fantasy: 'Invest in your system, scale services, and turn CRASHes into manageable incidents.', strengths: ['Strong mid/late game', 'High-quality services', 'Good recovery'], weaknesses: ['Limited Infrastructure slots', 'Investment before payoff'], designRule: 'DevOps receives rewards for controlling at least two services or handling CRASH events.' },
    nl: { identity: 'Schaalbaarheid & fouttolerantie', fantasy: 'Investeer in je systeem, schaal services en maak van CRASHes beheersbare incidenten.', strengths: ['Sterk midden- en eindspel', 'Hoge servicekwaliteit', 'Goed herstel'], weaknesses: ['Beperkte Infrastructure-plekken', 'Investering vóór opbrengst'], designRule: 'DevOps krijgt beloningen voor minstens twee eigen services of afgehandelde CRASH-gebeurtenissen.' },
  },
  data: {
    de: { identity: 'Selektion & Ressourcen', fantasy: 'Du filterst gezielt Informationen, ziehst die richtigen Tools und wandelst Daten in Spielvorteil um.', strengths: ['Kartenauswahl', 'Compute-Effizienz', 'Gezielte Antworten'], weaknesses: ['Wenig direkter Druck', 'Braucht Zeit zur Vorbereitung'], designRule: 'Data sollte Auswahl besser machen als bloß mehr Karten ziehen und AI auf vorbereitete Daten belohnen.' },
    en: { identity: 'Selection & Resources', fantasy: 'Filter information deliberately, draw the right tools, and turn data into an advantage.', strengths: ['Card selection', 'Compute efficiency', 'Targeted answers'], weaknesses: ['Little direct pressure', 'Needs setup time'], designRule: 'Data should improve selection rather than just draw more cards, and reward AI for prepared data.' },
    nl: { identity: 'Selectie & middelen', fantasy: 'Filter informatie doelgericht, trek de juiste tools en zet data om in spelvoordeel.', strengths: ['Kaartselectie', 'Compute-efficiëntie', 'Gerichte antwoorden'], weaknesses: ['Weinig directe druk', 'Heeft voorbereidingstijd nodig'], designRule: 'Data moet selectie beter maken dan alleen meer kaarten trekken en AI belonen voor voorbereide gegevens.' },
  },
  security: {
    de: { identity: 'Kontrolle & Schutz', fantasy: 'Sichere deinen Core, isoliere Risiken und zwinge den Gegner zu teuren, schlechten Entscheidungen.', strengths: ['Core-Schutz', 'Kontrolle einzelner Services', 'Stabile Trades'], weaknesses: ['Niedriger Explosivschaden', 'Reagiert statt zu eröffnen'], designRule: 'Security bekommt defensive Antworten und Kosten-Druck, aber keine überlegene Value-Engine ohne Risiko.' },
    en: { identity: 'Control & Protection', fantasy: 'Secure your Core, isolate risks, and force your opponent into expensive, poor decisions.', strengths: ['Core protection', 'Control of individual services', 'Reliable trades'], weaknesses: ['Low burst damage', 'Reacts instead of taking initiative'], designRule: 'Security gets defensive answers and cost pressure, but no superior value engine without risk.' },
    nl: { identity: 'Controle & bescherming', fantasy: 'Beveilig je Core, isoleer risico’s en dwing je tegenstander tot dure, slechte keuzes.', strengths: ['Core-bescherming', 'Controle over afzonderlijke services', 'Betrouwbare trades'], weaknesses: ['Lage explosieve schade', 'Reageert in plaats van te openen'], designRule: 'Security krijgt defensieve antwoorden en kostendruk, maar geen superieure value-engine zonder risico.' },
  },
  ai: {
    de: { identity: 'Optionen & Overclock', fantasy: 'Du generierst Möglichkeiten, bündelst Compute und gewinnst mit explosiven, vorbereiteten Turns.', strengths: ['Flexible Hand', 'Hohe Spitzenleistung', 'Starke Komboturns'], weaknesses: ['Volatilität', 'Gefahr von Leerlauf ohne Vorbereitung'], designRule: 'AI-Karten brauchen eine echte Wahl oder Vorbereitung; die größte Auszahlung darf nicht kostenlos sein.' },
    en: { identity: 'Options & Overclock', fantasy: 'Generate possibilities, pool Compute, and win with explosive, prepared turns.', strengths: ['Flexible hand', 'High peak output', 'Strong combo turns'], weaknesses: ['Volatility', 'Risk of stalling without setup'], designRule: 'AI cards need a real choice or setup; the biggest payoff must not be free.' },
    nl: { identity: 'Opties & Overclock', fantasy: 'Genereer mogelijkheden, bundel Compute en win met explosieve, voorbereide beurten.', strengths: ['Flexibele hand', 'Hoge piekprestatie', 'Sterke combobeurten'], weaknesses: ['Volatiliteit', 'Risico op stilvallen zonder voorbereiding'], designRule: 'AI-kaarten vereisen een echte keuze of voorbereiding; de grootste beloning mag niet gratis zijn.' },
  },
  neutral: {
    de: { identity: 'Werkzeugkasten', fantasy: 'Solide Spezialisten, die Lücken schließen, ohne die Identität einer Fraktion zu ersetzen.', strengths: ['Flexibilität', 'Deck-Kleber'], weaknesses: ['Keine dominanten Synergie-Pakete'], designRule: 'Neutrale Karten dürfen stabilisieren, aber niemals die beste Karte für eine Fraktions-Kernaufgabe sein.' },
    en: { identity: 'Toolbox', fantasy: 'Solid specialists that fill gaps without replacing a faction’s identity.', strengths: ['Flexibility', 'Deck glue'], weaknesses: ['No dominant synergy packages'], designRule: 'Neutral cards may stabilize, but must never be the best card for a faction’s core task.' },
    nl: { identity: 'Gereedschapskist', fantasy: 'Degelijke specialisten die gaten vullen zonder de identiteit van een factie te vervangen.', strengths: ['Flexibiliteit', 'Samenhang in het deck'], weaknesses: ['Geen dominante synergiepakketten'], designRule: 'Neutrale kaarten mogen stabiliseren, maar mogen nooit de beste kaart voor een kerntaak van een factie zijn.' },
  },
};

function localizedProfile(domain: Faction): FactionProfile {
  const source = rawProfiles[domain] as FactionProfile;
  const profile = { ...source };
  Object.defineProperty(profile, 'name', { enumerable: true, get: () => names[domain][getActiveLocale()] });
  for (const field of ['identity', 'fantasy', 'strengths', 'weaknesses', 'designRule'] as const) {
    Object.defineProperty(profile, field, { enumerable: true, get: () => copy[domain][getActiveLocale()][field] });
  }
  return profile;
}

export const factionProfiles = Object.fromEntries(
  (Object.keys(rawProfiles) as Faction[]).map((domain) => [domain, localizedProfile(domain)]),
) as Record<Faction, FactionProfile>;

export function factionProfile(domain: Domain): FactionProfile | undefined {
  return domain === 'token' ? undefined : factionProfiles[domain];
}
