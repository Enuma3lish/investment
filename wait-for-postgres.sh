# wait-for-postgres.sh
#!/bin/sh
set -e
HOST=$1
PORT=${POSTGRES_PORT:-5432}
echo "Waiting for $HOST:$PORT…"
until pg_isready -h "$HOST" -p "$PORT"; do
  sleep 2
done
echo "Postgres is up!"
