const eventLabels: Record<string, string> = {
  CARD_PLAYED: 'Karte ausgespielt',
  SERVICE_DEPLOYED: 'Service deployed',
  ATTACK_STARTED: 'Angriff gestartet',
  DAMAGE_DEALT: 'Schaden',
  SERVICE_CRASHED: 'Service gecrasht',
  REDUNDANCY_TRIGGERED: 'Redundancy ausgelöst',
  BUG_CREATED: 'BUG erstellt',
  TURN_STARTED: 'Neuer Zug',
  MEMORY_LEAK: 'Memory Leak',
  PATCH_APPLIED: 'Patch angewendet',
};

export function eventLabel(type: string): string {
  return eventLabels[type] ?? type.replaceAll('_', ' ').toLowerCase();
}
