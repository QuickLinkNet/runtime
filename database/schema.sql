CREATE TABLE IF NOT EXISTS players (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(24) NOT NULL,
  account_email VARCHAR(190) NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  account_created_at DATETIME NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  is_bot TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_players_last_seen (last_seen_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS matches (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  room_code CHAR(5) NOT NULL UNIQUE,
  mode ENUM('single','multi') NOT NULL,
  status ENUM('lobby','mulligan','active','finished','abandoned') NOT NULL DEFAULT 'lobby',
  owner_player_id BIGINT UNSIGNED NOT NULL,
  state_json LONGTEXT NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  finished_at DATETIME NULL,
  INDEX idx_matches_status (status),
  INDEX idx_matches_owner (owner_player_id),
  CONSTRAINT fk_match_owner FOREIGN KEY (owner_player_id) REFERENCES players(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS match_players (
  match_id BIGINT UNSIGNED NOT NULL,
  player_id BIGINT UNSIGNED NOT NULL,
  seat TINYINT UNSIGNED NOT NULL,
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (match_id, player_id),
  UNIQUE KEY unique_match_seat (match_id, seat),
  INDEX idx_player_matches (player_id, match_id),
  CONSTRAINT fk_mp_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_mp_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(191) NOT NULL PRIMARY KEY,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS player_progression (
  player_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  booster_balance INT UNSIGNED NOT NULL DEFAULT 0,
  credits INT UNSIGNED NOT NULL DEFAULT 0,
  salvage_components INT UNSIGNED NOT NULL DEFAULT 0,
  total_credits_earned INT UNSIGNED NOT NULL DEFAULT 0,
  test_mode TINYINT(1) NOT NULL DEFAULT 0,
  total_boosters_opened INT UNSIGNED NOT NULL DEFAULT 0,
  last_booster_at DATETIME NULL,
  tutorial_completed_at DATETIME NULL,
  tutorial_reward_claimed_at DATETIME NULL,
  first_win_at DATETIME NULL,
  first_win_reward_claimed_at DATETIME NULL,
  matches_played INT UNSIGNED NOT NULL DEFAULT 0,
  wins INT UNSIGNED NOT NULL DEFAULT 0,
  losses INT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_progression_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_player_id BIGINT UNSIGNED NOT NULL,
  target_player_id BIGINT UNSIGNED NULL,
  action VARCHAR(80) NOT NULL,
  details_json TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin_audit_created (created_at),
  INDEX idx_admin_audit_target (target_player_id, created_at),
  CONSTRAINT fk_admin_audit_admin FOREIGN KEY (admin_player_id) REFERENCES players(id),
  CONSTRAINT fk_admin_audit_target FOREIGN KEY (target_player_id) REFERENCES players(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS player_collections (
  player_id BIGINT UNSIGNED NOT NULL,
  card_definition_id VARCHAR(100) NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 0,
  first_acquired_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (player_id, card_definition_id),
  CONSTRAINT fk_collection_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS player_contracts (
  player_id BIGINT UNSIGNED NOT NULL,
  cycle_key VARCHAR(16) NOT NULL,
  contract_key VARCHAR(64) NOT NULL,
  progress INT UNSIGNED NOT NULL DEFAULT 0,
  claimed_at DATETIME NULL,
  PRIMARY KEY (player_id, cycle_key, contract_key),
  CONSTRAINT fk_contract_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS player_loadouts (
  player_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  deck_json TEXT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_loadout_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS player_deck_slots (
  id CHAR(32) NOT NULL PRIMARY KEY,
  player_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(40) NOT NULL,
  deck_json TEXT NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_deck_slots_player (player_id, is_active, updated_at),
  CONSTRAINT fk_deck_slots_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS booster_openings (
  id CHAR(32) NOT NULL PRIMARY KEY,
  player_id BIGINT UNSIGNED NOT NULL,
  cards_json TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_booster_player (player_id, created_at),
  CONSTRAINT fk_booster_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS balance_reports (
  id CHAR(32) NOT NULL PRIMARY KEY,
  admin_player_id BIGINT UNSIGNED NOT NULL,
  simulated_matches INT UNSIGNED NOT NULL,
  report_json MEDIUMTEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_balance_reports_created (created_at),
  CONSTRAINT fk_balance_report_admin FOREIGN KEY (admin_player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS match_action_telemetry (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  match_id BIGINT UNSIGNED NOT NULL,
  player_id BIGINT UNSIGNED NOT NULL,
  action_type VARCHAR(32) NOT NULL,
  expected_version INT UNSIGNED NOT NULL,
  resolved_version INT UNSIGNED NOT NULL,
  duration_ms INT UNSIGNED NOT NULL DEFAULT 0,
  accepted TINYINT(1) NOT NULL,
  error_code VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_action_telemetry_match (match_id, created_at),
  INDEX idx_action_telemetry_type (action_type, accepted, created_at),
  CONSTRAINT fk_action_telemetry_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_action_telemetry_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS match_summaries (
  match_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  winner_player_id BIGINT UNSIGNED NULL,
  finish_reason VARCHAR(32) NOT NULL,
  turns INT UNSIGNED NOT NULL,
  duration_seconds INT UNSIGNED NOT NULL,
  metrics_json TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_match_summaries_reason (finish_reason, created_at),
  CONSTRAINT fk_match_summary_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_match_summary_winner FOREIGN KEY (winner_player_id) REFERENCES players(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
