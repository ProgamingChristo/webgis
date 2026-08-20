# GETRA — Future Survey and MAPID Ingestion Plan

## Current state

The database foundation is ready to receive data, but the project intentionally has no field-survey rows and no raw MAPID competition rows yet.

## Known source families

### Community Maps Activity

Known source concepts:

- title
- description
- latitude
- longitude
- medias
- images
- videos

Stored in `community_activities`, plus `raw_payload` so source-contract changes do not destroy information.

### Menu Go

Known source concepts include place name/type, date/time, place/menu photos, digital menu, main menu, average price, buyer condition, mobility, latitude and longitude.

Stored in `mission_menu_records`.

### Struk Go

Receipt/evidence data can contain personal information. Raw records and media references therefore remain restricted and are never a public browser layer.

Stored in `mission_receipt_records`.

### Properti Go

Known source concepts include property category, sale/rent type, record date, address, front/promotional photos, latitude and longitude.

Stored in `mission_property_records`.

## Ingestion sequence when real access arrives

```text
1. Record/confirm terms in data_sources
2. Create dataset_ingestion_runs row
3. Fetch/import through backend only
4. Preserve raw payload + source record id
5. Validate coordinates, required attributes and privacy
6. Deduplicate
7. Mark rejected/stale records explicitly
8. Normalize eligible records
9. Link canonical records through merchant_source_links
10. Publish only after validation criteria pass
```

## Survey evolution rule

Do not permanently keep important analytical attributes buried in JSONB once the survey contract becomes stable. Use JSONB now as a compatibility envelope; normalize stable fields later with an explicit versioned migration.
