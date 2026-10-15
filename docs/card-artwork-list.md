# RUNTIME – Artwork-Liste

Stand: 94 Karten und Tokens. Für alle 90 spielbaren Karten und 4 Tokens liegen fertige Dateien unter `public/card-assets/art`; jede Definition ist in `src/game/cardArtwork.ts` zugeordnet. Die folgende Tabelle dokumentiert das 48-Karten-Basisset und die Tokens, die Erweiterung ist unter [Set 2 – Production Incident](set-2-production-incident.md) beschrieben. Neue Artworks werden bevorzugt als WebP abgelegt; vier frühe Frontend-Artworks liegen weiterhin als JPG vor, neuere Audit-Karten teilweise als PNG.

Die Kartenrahmen liegen direkt unter `public/card-assets/`: `card_service_background.png` für Common sowie die Varianten `_uncommon`, `_rare` und `_legendary`. Die Auswahl erfolgt zentral über `src/game/cardRarity.ts` und gilt dadurch für Match, Deck Builder, Booster, Sammlung und Detailansichten.

## Frontend

| Datei | Karte | Typ |
|---|---|---|
| `frontend-react-component.jpg` | React Component | Service |
| `frontend-vue-widget.jpg` | Vue Widget | Service |
| `frontend-angular-module.jpg` | Angular Enterprise | Service |
| `frontend-web-worker.jpg` | Web Worker | Service |
| `frontend-infinite-rerender.webp` | Infinite Re-Render | Command |
| `frontend-state-store.webp` | State Store | Infrastructure |

## Backend

| Datei | Karte | Typ |
|---|---|---|
| `backend-legacy-php.webp` | Legacy PHP Server | Service |
| `backend-api-gateway.webp` | API Gateway | Service |
| `backend-queue-worker.webp` | Queue Worker | Service |
| `backend-java-service.webp` | Java Service | Service |
| `backend-hotfix.webp` | Hotfix | Command |
| `backend-message-queue.webp` | Message Queue | Infrastructure |

## Infrastructure

| Datei | Karte | Typ |
|---|---|---|
| `infrastructure-docker-container.webp` | Docker Container | Service |
| `infrastructure-load-balancer.webp` | Load Balancer | Service |
| `infrastructure-auto-scaler.webp` | Auto Scaler | Service |
| `infrastructure-kubernetes-pod.webp` | Kubernetes Pod | Service |
| `infrastructure-horizontal-scaling.webp` | Horizontal Scaling | Command |
| `infrastructure-kubernetes-cluster.webp` | Kubernetes Cluster | Infrastructure |

## Data

| Datei | Karte | Typ |
|---|---|---|
| `data-query-engine.webp` | Query Engine | Service |
| `data-database-replica.webp` | Database Replica | Service |
| `data-vector-database.webp` | Vector Database | Service |
| `data-data-engineer.webp` | Data Engineer | Service |
| `data-select-all.webp` | SELECT * | Command |
| `data-redis-cache.webp` | Redis Cache | Infrastructure |

## Security

| Datei | Karte | Typ |
|---|---|---|
| `security-firewall-gateway.webp` | Firewall Gateway | Service |
| `security-sandbox-container.webp` | Sandbox Container | Service |
| `security-rate-limiter.webp` | Rate Limiter | Service |
| `security-security-engineer.webp` | Security Engineer | Service |
| `security-emergency-patch.webp` | Emergency Patch | Command |
| `security-zero-trust.webp` | Zero Trust Proxy | Infrastructure |

## AI

| Datei | Karte | Typ |
|---|---|---|
| `ai-llm-agent.webp` | LLM Agent | Service |
| `ai-inference-worker.webp` | Inference Worker | Service |
| `ai-vision-model.webp` | Vision Model | Service |
| `ai-embedding-model.webp` | Embedding Model | Service |
| `ai-hallucination.webp` | Hallucination | Command |
| `ai-gpu-cluster.webp` | GPU Cluster | Infrastructure |

## Neutral

| Datei | Karte | Typ |
|---|---|---|
| `neutral-junior-developer.webp` | Junior Developer | Service |
| `neutral-senior-developer.webp` | Senior Developer | Service |
| `neutral-qa-engineer.webp` | QA Engineer | Service |
| `neutral-rubber-duck.webp` | Rubber Duck | Service |
| `neutral-old-workstation.webp` | Old Workstation | Service |
| `neutral-project-manager.webp` | Project Manager | Service |
| `neutral-coffee.webp` | Coffee | Command |
| `neutral-force-push.webp` | Force Push | Command |
| `neutral-stack-overflow.webp` | Stack Overflow | Command |
| `neutral-spaghetti-code.webp` | Spaghetti Code | Command |
| `neutral-friday-deploy.webp` | Friday Deploy | Command |
| `neutral-ci-pipeline.webp` | CI Pipeline | Infrastructure |

## Tokens

| Datei | Karte | Typ |
|---|---|---|
| `token-child-component.webp` | Child Component | Token-Service |
| `token-replica.webp` | Replica | Token-Service |
| `token-bug.webp` | BUG | Token-Service |
| `token-bootstrap.webp` | BOOTSTRAP | Token-Command |

## Vorgaben für die Generierung

- Empfohlenes Format für das Artwork-Fenster: 16:9 oder ähnlich, mindestens 1600 × 900 px
- Dateityp: JPG oder WebP
- Kein Text, keine Zahlen, keine Logos und kein Kartenrahmen
- Hauptmotiv mittig setzen; die äußeren 10 % können beim Zuschnitt verloren gehen
- Einheitlicher düsterer Sci-Fi-/Cyberpunk-Stil
- Die Domain darf über Lichtfarbe und Atmosphäre erkennbar sein
