<?php
declare(strict_types=1);

final class CardCatalog
{
    /** @var array<string,array<string,mixed>> */
    private array $cards = [];

    public function __construct(?string $path = null)
    {
        $path ??= dirname(__DIR__, 2) . '/shared/cards.json';
        $decoded = json_decode((string)file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        foreach ($decoded as $card) {
            $this->cards[$card['id']] = $card;
        }
    }

    public function get(string $id): array
    {
        if (!isset($this->cards[$id])) {
            throw new ApiException('UNKNOWN_CARD', 'Unbekannte Karte: ' . $id);
        }
        return $this->cards[$id];
    }

    public function all(bool $includeTokens = false): array
    {
        return array_values(array_filter(
            $this->cards,
            static fn(array $card): bool => $includeTokens || !($card['token'] ?? false)
        ));
    }

    public function validateDeck(array $definitionIds): array
    {
        if (count($definitionIds) !== 30) {
            throw new ApiException('INVALID_DECK_SIZE', 'Ein Deck muss genau 30 Karten enthalten.');
        }
        $counts = array_count_values($definitionIds);
        $domains = [];
        foreach ($counts as $id => $count) {
            $card = $this->get((string)$id);
            if (($card['token'] ?? false) || $count > 2) {
                throw new ApiException('INVALID_DECK_COPIES', 'Maximal zwei Kopien pro Karte sind erlaubt.');
            }
            if ($card['domain'] !== 'neutral') {
                $domains[$card['domain']] = true;
            }
        }
        if (count($domains) !== 2) {
            throw new ApiException('INVALID_DECK_DOMAINS', 'Das Deck muss genau zwei Tech-Domains enthalten.');
        }
        return array_keys($domains);
    }

    public function starterDeck(string $key): array
    {
        $pairs = [
            'frontend-backend' => ['frontend', 'backend'],
            'infrastructure-security' => ['infrastructure', 'security'],
            'data-ai' => ['data', 'ai'],
        ];
        $domains = $pairs[$key] ?? $pairs['frontend-backend'];
        $domainCards = array_values(array_filter($this->all(), static fn(array $c): bool => in_array($c['domain'], $domains, true)));
        $neutral = array_values(array_filter($this->all(), static fn(array $c): bool => $c['domain'] === 'neutral'));
        $deck = [];
        foreach ($domainCards as $card) {
            $deck[] = $card['id'];
            $deck[] = $card['id'];
        }
        foreach (array_slice($neutral, 0, 3) as $card) {
            $deck[] = $card['id'];
            $deck[] = $card['id'];
        }
        $this->validateDeck($deck);
        return $deck;
    }
}
