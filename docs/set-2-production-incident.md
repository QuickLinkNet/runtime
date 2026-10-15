# Set 2 – Production Incident

Das erste Erweiterungsset begann mit 24 Production-Incident-Karten. Jede Tech-Domain erhielt einen Service, einen Command und eine Infrastructure; Neutral erhielt sechs Karten. Anschließend kamen 18 System-Upgrade-Karten hinzu, jeweils drei weitere Karten für jede der sechs Tech-Domains. Das Erweiterungsset umfasst damit 42 spielbare Karten; seine Effekte sind vollständig serverseitig implementiert.

| Domain | Common | Uncommon | Rare / Legendary |
|---|---|---|---|
| Frontend | Microfrontend | Feature Flag | Design System (Rare) |
| Backend | GraphQL Gateway | Retry Storm | Circuit Breaker (Rare) |
| DevOps | Chaos Monkey | Terraform Apply | Service Mesh (Rare) |
| Data | Data Scientist | Schema Migration | Event Stream (Rare) |
| Security | Penetration Tester | Rotate Secrets | SIEM (Rare) |
| AI | Prompt Engineer | Model Drift | RAG Pipeline (Rare) |
| Neutral | Werkstudent, Product Owner | Scrum Master, Monitoring Dashboard | Maintenance Window (Rare), Technical Debt (Legendary) |

## Artwork-Stand

Die ursprüngliche Artwork-Queue ist abgeschlossen. Diese 24 Production-Incident-Dateien liegen unter `public/card-assets/art` vor:

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
- Alle 90 spielbaren Karten besitzen eine Seltenheit in `shared/booster-config.json`.
- Set-2-Effekte sind getrennt in `api/game/ProductionIncidentEffects.php` gekapselt.
- Kunden-/Reaction-Karten gehören bewusst nicht zu diesem Set; dafür wird später zuerst ein Reaktionsfenster im Zugablauf gebaut.

## System Upgrade

Die zweite Welle ergänzt je Tech-Domain drei Karten und schärft vorhandene Archetypen:

- Frontend: Error Boundary, Component Library, Edge Runtime
- Backend: Idempotency Key, Dead Letter Queue, Event Store
- DevOps: SLO Monitor, Rolling Deploy, Disaster Recovery Plan
- Data: Query Planner, Data Quality Gate, Predictive Query
- Security: SOC Analyst, Access Review, Containment Plan
- AI: Model Router, Model Ensemble, Inference Burst

Auch für diese 18 Karten sind Artwork, Seltenheit, Kartenübersetzung und serverseitige Effekte vollständig zugeordnet.
