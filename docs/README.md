# GETRA Documentation Index

This directory contains the definitive references for the GETRA system as captured in the Phase 13 Integration Baseline.

## Master Documentation (PDF)
- 📄 **[GETRA Final System Documentation (PDF)](GETRA_Final_System_Documentation.pdf)** - The complete, consolidated handbook, architecture diagrams, and system overview. *(Generated from `GETRA_Final_System_Documentation.md`)*

## Core References
- [GETRA Integration Baseline](GETRA_Integration_Baseline.md) - Outlines the frozen Integration Track baseline, technical debt, and rules for future feature development.
- [GETRA Developer Handover](GETRA_Developer_Handover.md) - The starting point for any new engineer onboarding to the GETRA codebase.
- [GETRA API Reference](GETRA_API_Reference.md) - Complete catalog of available endpoints, authentication rules, and behaviors.
- [GETRA Database Reference](GETRA_Database_Reference.md) - Overview of the PostgreSQL/Supabase schema, RLS philosophy, and migration procedures.
- [GETRA GIS & Routing Reference](GETRA_GIS_Routing_Reference.md) - Details on how PostGIS and pgRouting are leveraged for spatial lookups and shortest-path walking routes.
- [GETRA Grounded AI Architecture](GETRA_AI_Architecture.md) - Describes the "GIS Computes. AI Interprets" logic.
- [GETRA Environment Reference](GETRA_Environment_Reference.md) - Catalog of public and secret environment variables.

## Operations & Deployment
- [GETRA Testing Runbook](GETRA_Testing_Runbook.md) - Commands, quality gates, and status definitions for verifying code integrity.
- [GETRA Deployment Handover](GETRA_Deployment_Handover.md) - Checklists, considerations, and build commands for moving towards production environments.
- [GETRA Troubleshooting Runbook](GETRA_Troubleshooting_Runbook.md) - Operational diagnostics for ports, spatial errors, auth, and external providers.

> **Note**: If any historical report (e.g. `Integration_Phase_X_Final_Report.md`) conflicts with the documents linked above, the documents above take precedence, reflecting the **actual system state**.
