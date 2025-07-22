#!/usr/bin/env bash
set -e

# defaults if not provided
POSTGRES_HOST="${POSTGRES_HOST:-db}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
DJANGO_PORT="${DJANGO_PORT:-8000}"

echo "⏳ Waiting for PostgreSQL at $POSTGRES_HOST:$POSTGRES_PORT…"
until pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" >/dev/null 2>&1; do
  sleep 2
done
echo "✅ PostgreSQL is ready!"

echo "🔄 Running Django migrations…"
python manage.py migrate --no-input

echo "🗃️ Ensuring celery‑beat tables…"
python manage.py migrate django_celery_beat --no-input

echo "👤 Creating superuser if missing…"
python manage.py shell -c "from django.contrib.auth import get_user_model; U=get_user_model();\
U.objects.filter(username='admin').exists() or U.objects.create_superuser('admin','admin@example.com','admin123')"

echo "🚀 Launching Django on port $DJANGO_PORT…"
exec python manage.py runserver 0.0.0.0:"$DJANGO_PORT"
