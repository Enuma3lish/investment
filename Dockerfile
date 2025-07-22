FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       postgresql-client dos2unix \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Only process the files you actually have
RUN dos2unix run_web.sh wait-for-postgres.sh \
    && chmod +x run_web.sh wait-for-postgres.sh

ENV DJANGO_SETTINGS_MODULE=pretest.settings \
    POSTGRES_HOST=db \
    POSTGRES_PORT=5432 \
    DJANGO_PORT=8000

EXPOSE 8000

ENTRYPOINT ["./run_web.sh"]