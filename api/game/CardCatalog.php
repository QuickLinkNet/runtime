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
        $path = dirname(__DIR__, 2) . '/shared/starter-decks.json';
        $decks = json_decode((string)file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        $deck = $decks[$key] ?? $decks['frontend-backend'];
        $this->validateDeck($deck);
        return $deck;
    }

    public function isStarterDeck(array $deck): bool
    {
        sort($deck, SORT_STRING);
        foreach (['frontend-backend', 'infrastructure-security', 'data-ai'] as $key) {
            $candidate = $this->starterDeck($key);
            sort($candidate, SORT_STRING);
            if ($candidate === $deck) {
                return true;
            }
        }
        return false;
    }
}
