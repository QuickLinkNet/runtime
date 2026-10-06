# Set 2 – Production Incident

Das erste Erweiterungsset ergänzt den Basispool um 24 Karten. Jede Tech-Domain erhält einen Service, einen Command und eine Infrastructure; Neutral erhält sechs Karten. Die Effekte sind vollständig serverseitig implementiert.

| Domain | Common | Uncommon | Rare / Legendary |
|---|---|---|---|
| Frontend | Microfrontend | Feature Flag | Design System (Rare) |
| Backend | GraphQL Gateway | Retry Storm | Circuit Breaker (Rare) |
| DevOps | Chaos Monkey | Terraform Apply | Service Mesh (Rare) |
| Data | Data Scientist | Schema Migration | Event Stream (Rare) |
| Security | Penetration Tester | Rotate Secrets | SIEM (Rare) |
| AI | Prompt Engineer | Model Drift | RAG Pipeline (Rare) |
| Neutral | Werkstudent, Product Owner | Scrum Master, Monitoring Dashboard | Maintenance Window (Rare), Technical Debt (Legendary) |

## Artwork-Queue

Die Karten funktionieren bereits ohne Artwork. Für die finale Darstellung fehlen genau diese Dateien unter `public/card-assets/art`:

```text
frontend-microfrontend.webp
frontend-feature-flag.webp
frontend-design-system.webp
backend-graphql-gateway.webp
backend-retry-storm.webp
backend-circuit-breaker.webp
infrastructure-chaos-monkey.webp
infrastructure-terraform-apply.webp
infrastructure-service-mesh.webp
data-data-scientist.webp
data-schema-migration.webp
data-event-stream.webp
security-penetration-tester.webp
security-rotate-secrets.webp
security-siem.webp
ai-prompt-engineer.webp
ai-model-drift.webp
ai-rag-pipeline.webp
neutral-werkstudent.webp
neutral-product-owner.webp
neutral-scrum-master.webp
neutral-monitoring-dashboard.webp
neutral-maintenance-window.webp
neutral-technical-debt.webp
```

Generationsvorgabe: 16:9, mindestens 1600 × 900 px, Hauptmotiv groß und mittig, kein Text, keine Zahlen, keine Logos und kein Kartenrahmen. Die äußeren 10 Prozent müssen verzichtbar sein.

## Technische Leitplanken

- Die drei Starterdecks liegen jetzt explizit in `shared/starter-decks.json` und bleiben bei exakt 30 Karten, wenn der Pool wächst.
- Alle 72 spielbaren Karten besitzen eine Seltenheit in `shared/booster-config.json`.
- Set-2-Effekte sind getrennt in `api/game/ProductionIncidentEffects.php` gekapselt.
- Kunden-/Reaction-Karten gehören bewusst nicht zu diesem Set; dafür wird später zuerst ein Reaktionsfenster im Zugablauf gebaut.
