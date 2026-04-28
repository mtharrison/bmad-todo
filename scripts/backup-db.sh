#!/usr/bin/env bash
set -euo pipefail

# SQLite backup to Cloudflare R2.
# Intended for cron on Fly machine (manual setup, not automated).
# Requires rclone configured with an R2 remote named "r2".
#
# Usage: ./scripts/backup-db.sh /data/bmad-todo.db r2:bmad-todo-backups

DB_PATH="${1:?Usage: backup-db.sh <db-path> <r2-dest>}"
R2_DEST="${2:?Usage: backup-db.sh <db-path> <r2-dest>}"
RETENTION_DAYS="${3:-30}"

TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_FILE="/tmp/bmad-todo-${TIMESTAMP}.db"

sqlite3 "$DB_PATH" "PRAGMA wal_checkpoint(TRUNCATE);"
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

rclone copyto "$BACKUP_FILE" "${R2_DEST}/bmad-todo-${TIMESTAMP}.db"
rm -f "$BACKUP_FILE"

rclone delete "${R2_DEST}" --min-age "${RETENTION_DAYS}d" --include "bmad-todo-*.db"
