<?php
declare(strict_types=1);

final class BotProfiles
{
    /** @var array<string,array<string,mixed>> */
    private array $profiles;

    public function __construct(private CardCatalog $catalog, ?string $path = null)
    {
        $path ??= dirname(__DIR__, 2) . '/shared/bot-profiles.json';
        $profiles = json_decode((string)file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        foreach ($profiles as $key => $profile) {
            if (!is_array($profile) || !isset($profile['name'], $profile['deck'])) {
                throw new RuntimeException('Invalid bot profile: ' . $key);
            }
            $this->catalog->validateDeck((array)$profile['deck']);
        }
        $this->profiles = $profiles;
    }

    /** @return array<string,mixed> */
    public function get(string $key): array
    {
        if (!isset($this->profiles[$key])) {
            throw new ApiException('INVALID_BOT_PROFILE', 'Unbekanntes Bot-Profil.', 400);
        }
        return $this->profiles[$key];
    }

    /** @return array<string,array<string,mixed>> */
    public function all(): array
    {
        return $this->profiles;
    }
}
