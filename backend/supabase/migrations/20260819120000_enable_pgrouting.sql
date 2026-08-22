-- Migration: Enable pgRouting Extension
-- Description: Enables the pgrouting extension for shortest path and network routing.

CREATE EXTENSION IF NOT EXISTS pgrouting;
