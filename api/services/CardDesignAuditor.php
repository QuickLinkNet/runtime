<?php
declare(strict_types=1);

/**
 * Reviews card intent before telemetry can tell us whether a card is too strong.
 * It never changes cards; it produces a transparent design-review queue.
 */
final class CardDesignAuditor
{
    public function __construct(private CardCatalog $catalog) {}

    /** @return array<int,array<string,mixed>> */
    public function audit(): array
    {
        $rows = [];
        foreach ($this->catalog->all() as $card) $rows[] = $this->review($card);
        usort($rows, static fn(array $left, array $right): int => ($left['score'] <=> $right['score']) ?: strcmp($left['name'], $right['name']));
        return $rows;
    }

    /** @return array<string,mixed> */
    private function review(array $card): array
    {
        $id = (string)$card['id'];
        $text = mb_strtolower((string)($card['text'] ?? ''));
        $signals = [];
        $proposals = [];
        $score = 100;

        $persistentLanguage = ['einmal pro eigenem zug', 'pro eigenem zug', 'pro zug', 'am zugende', 'am ende deines zuges', 'wenn ', 'solange ', 'der erste ', 'deine ', 'gegnerische ', 'kosten', 'erhält'];
        $hasPersistentLanguage = array_reduce($persistentLanguage, static fn(bool $found, string $needle): bool => $found || str_contains($text, $needle), false);
        if (($card['type'] ?? '') === 'infrastructure' && str_starts_with($text, 'deploy:') && !$hasPersistentLanguage) {
            $this->flag($signals, $proposals, $score, 'high', 'Diese Infrastructure hat nach ihrem Deploy keinen erkennbaren bleibenden Spielwert.', 'Gib ihr einen wiederkehrenden Trigger, eine dauerhafte Kostenregel oder eine klar sichtbare Schutz-/Value-Achse.');
        }

        if (str_contains($text, 'der erste ') && !str_contains($text, 'pro eigenem zug') && !str_contains($text, 'pro zug')) {
            $this->flag($signals, $proposals, $score, 'medium', 'Der Text nutzt „der erste“, nennt aber kein Zeitfenster.', 'Präzisiere, ob es beim Deploy einmalig gilt oder „einmal pro eigenem Zug“ ausgelöst wird.');
        }

        if (str_contains($text, 'nächster ') && !str_contains($text, 'bis zum beginn') && !str_contains($text, 'in diesem zug')) {
            $this->flag($signals, $proposals, $score, 'medium', 'Ein „nächster“-Effekt hat kein eindeutig sichtbares Ablauf-Fenster.', 'Nenne das Ende explizit, etwa „bis zum Beginn deines nächsten Zuges“ oder „in diesem Zug“.');
        }

        if (($card['type'] ?? '') === 'command' && (int)($card['cost'] ?? 0) >= 3 && preg_match('/^zieh(?:e)? 1 karte\.?$/u', trim((string)($card['text'] ?? '')))) {
            $this->flag($signals, $proposals, $score, 'medium', 'Ein teurer Command mit nur einem Kartenziehen erzeugt wenig Entscheidung und wenig Tempo.', 'Verbinde den Draw mit einer Bedingung, Auswahl oder Fraktions-Synergie statt nur eine Karte zu ziehen.');
        }

        foreach ($this->knownReview($id) as $item) {
            $this->flag($signals, $proposals, $score, $item['severity'], $item['signal'], $item['proposal']);
        }

        $score = max(0, $score);
        $status = $score < 60 ? 'review' : ($score < 85 ? 'watch' : 'solid');
        return [
            'definitionId' => $id,
            'name' => (string)$card['name'],
            'domain' => (string)$card['domain'],
            'type' => (string)$card['type'],
            'score' => $score,
            'status' => $status,
            'summary' => $signals === [] ? 'Klare Rolle und erkennbarer Spielwert. Gegen echte Matchdaten weiter beobachten.' : implode(' ', array_column($signals, 'text')),
            'signals' => $signals,
            'proposals' => array_values(array_unique($proposals)),
        ];
    }

    /** @return array<int,array{severity:string,signal:string,proposal:string}> */
    private function knownReview(string $id): array
    {
        if (in_array($id, ['backend-circuit-breaker', 'data-event-stream', 'neutral-monitoring-dashboard', 'backend-idempotency-key', 'infrastructure-rolling-deploy', 'data-data-quality-gate', 'data-query-planner', 'data-predictive-query', 'frontend-error-boundary', 'infrastructure-service-mesh', 'security-siem', 'frontend-state-store', 'ai-vision-model', 'ai-model-ensemble'], true)) {
            return [];
        }
        return match ($id) {
            'backend-circuit-breaker' => [[
                'severity' => 'high',
                'signal' => 'Circuit Breaker verspricht im Text eine zukünftige „erste“ Backend-Karte, löst beim Deploy aber nur einmalig auf bereits liegende Services.',
                'proposal' => 'Entweder Text als einmaligen Deploy-Buff schreiben oder die Engine auf „einmal pro eigenem Zug: dein erster Backend-Service erhält REDUNDANCY“ umbauen.',
            ]],
            'data-event-stream' => [[
                'severity' => 'high',
                'signal' => 'Event Stream ist eine teure Infrastructure mit einem einzigen Deploy-Draw und danach ohne Rolle auf dem Board.',
                'proposal' => 'Umbau: „Einmal pro eigenem Zug, nachdem du eine Data-Karte gespielt hast, ziehe 1 Karte; dann lege 1 Handkarte unter dein Deck.“ Das schafft dauerhaften Value mit Entscheidung.',
            ]],
            'neutral-monitoring-dashboard' => [[
                'severity' => 'high',
                'signal' => 'Monitoring Dashboard ist ebenfalls nur ein einmaliger Deploy-Draw auf einem Infrastructure-Slot.',
                'proposal' => 'Umbau: „Am Ende deines Zuges: Falls du in diesem Zug einen Service gepatcht oder einen BUG entfernt hast, ziehe 1 Karte.“',
            ]],
            'backend-idempotency-key' => [[
                'severity' => 'high',
                'signal' => 'Der Kartentext verspricht eine Backend-Karte nach einem Rueckgabe-Event, die aktuelle Engine verleiht stattdessen Integrity.',
                'proposal' => 'Text und Effekt angleichen: entweder echte Backend-Suche nach Rueckgabe bauen oder den Text ehrlich als Integrity/PATCH-Bonus formulieren.',
            ]],
            'infrastructure-rolling-deploy' => [[
                'severity' => 'high',
                'signal' => 'Rolling Deploy nennt einen zurueckgegebenen Service mit Kostenbedingung; die Engine markiert derzeit nicht verlaesslich genau diese Karte.',
                'proposal' => 'Die konkrete Karteninstanz beim Zurueckgeben markieren und Kosten <= 3 dort pruefen, bevor der naechste Ausspiel-Rabatt entsteht.',
            ]],
            'data-data-quality-gate' => [[
                'severity' => 'high',
                'signal' => 'Data Quality Gate spricht von Auswahl und Unter-das-Deck-Legen, die Engine trifft beide Entscheidungen automatisch und nutzt eine andere Deckposition.',
                'proposal' => 'Eine echte Auswahlaufloesung bauen oder den Kartentext auf die automatische Wirkung reduzieren.',
            ]],
            'data-query-planner' => [[
                'severity' => 'high',
                'signal' => 'Query Planner fordert eine Auswahl aus drei Karten; die Engine bestimmt die Karte automatisch.',
                'proposal' => 'Auswahl-UI fuer die obersten drei Karten implementieren oder die automatische Priorisierung klar im Text benennen.',
            ]],
            'data-predictive-query' => [[
                'severity' => 'high',
                'signal' => 'Predictive Query verspricht bis zu zwei frei waehlbare Karten verschiedener Typen, die Engine trifft die Auswahl automatisch.',
                'proposal' => 'Echte Auswahl in zwei Schritten anbieten oder die Suchregel exakt als automatisch beschreiben.',
            ]],
            'frontend-error-boundary' => [[
                'severity' => 'high',
                'signal' => 'Error Boundary sagt "anderen Frontend-Service"; die Zielpruefung erlaubt aktuell auch die Karte selbst.',
                'proposal' => 'Die eigene Instanz als PATCH-Ziel ausschliessen.',
            ]],
            'infrastructure-service-mesh' => [[
                'severity' => 'medium',
                'signal' => 'Service Mesh liefert nur beim Deploy einen starken, aber stark schwankenden Board-Moment und danach keinen Plan mehr.',
                'proposal' => 'Entweder den einmaligen Effekt bewusst begrenzen oder ihm einen kleinen wiederkehrenden Service-Deploy-Payoff geben.',
            ]],
            'ai-vision-model' => [[
                'severity' => 'medium',
                'signal' => 'Vision Model zieht nur bei gegnerischem BUG und verliert sonst seinen gesamten Deploy-Value.',
                'proposal' => 'Fallback ergaenzen, etwa ohne BUG die obersten zwei Karten ansehen und beliebig zuruecklegen.',
            ]],
            'security-siem' => [[
                'severity' => 'medium',
                'signal' => 'SIEM ist als teure Infrastructure ohne gegnerischen BUG beim Deploy komplett leer.',
                'proposal' => 'Immer eine Karte ziehen; bei einem gegnerischen BUG stattdessen zwei ziehen.',
            ]],
            'frontend-state-store' => [[
                'severity' => 'medium',
                'signal' => 'Mehrere State Stores stapeln ihren ersten-Service-Rabatt, der Text erklaert diese Stapelung nicht.',
                'proposal' => 'Entweder "jeder State Store" in den Text aufnehmen oder nur eine aktive Instanz fuer den Rabatt werten.',
            ]],
            'backend-event-store' => [[
                'severity' => 'medium',
                'signal' => 'Event Store sagt "Nimm eine Backend-Karte", die Engine waehlt jedoch automatisch die erste passende Karte aus dem Trash.',
                'proposal' => 'Auswahl aus dem Trash bauen oder die letzte passende Karte als klares, automatisches Ziel definieren.',
            ]],
            'ai-model-ensemble' => [[
                'severity' => 'medium',
                'signal' => 'Model Ensemble fordert das Offenbaren einer Data-Karte, die Engine prueft ihre Existenz aber ohne sichtbares Reveal.',
                'proposal' => 'Reveal-Ereignis sichtbar machen oder den Text zu "Hast du eine Data-Karte auf der Hand" vereinfachen.',
            ]],
            default => [],
        };
    }

    /** @param array<int,array{severity:string,text:string}> $signals @param array<int,string> $proposals */
    private function flag(array &$signals, array &$proposals, int &$score, string $severity, string $signal, string $proposal): void
    {
        foreach ($signals as $existing) if ($existing['text'] === $signal) return;
        $signals[] = ['severity' => $severity, 'text' => $signal];
        $proposals[] = $proposal;
        $score -= $severity === 'high' ? 45 : 18;
    }
}
