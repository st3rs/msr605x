#!/bin/bash
set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/msr-ops"
CONTAINER_NAME="msr_postgres"
DB_USER="msr_user"
DB_NAME="msr_db"

mkdir -p $BACKUP_DIR

# 1. Dump Database
docker exec -t $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME > "$BACKUP_DIR/db_dump_$TIMESTAMP.sql"

# 2. Compress
gzip "$BACKUP_DIR/db_dump_$TIMESTAMP.sql"

# 3. Cleanup older than 7 days
find $BACKUP_DIR -type f -name "*.gz" -mtime +7 -delete

# 4. Optional: Sync to S3 (Uncomment if AWS CLI is installed)
# aws s3 cp "$BACKUP_DIR/db_dump_$TIMESTAMP.sql.gz" s3://my-msr-backups/
