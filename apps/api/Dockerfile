# Backend BQ — dùng khi cần tự host trong mạng nội bộ của BQ (bắt buộc nếu SAP B1
# Service Layer không mở ra Internet). Build từ GỐC repo:
#   docker build -f apps/api/Dockerfile -t bq-api .
FROM python:3.12-slim

WORKDIR /srv

# Cài dependency trước, copy code sau → sửa code không phải cài lại thư viện.
COPY apps/api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/api/app ./app

# Chạy bằng user thường thay vì root.
RUN useradd --create-home --uid 10001 bq && chown -R bq:bq /srv
USER bq

ENV BQ_DATA_SOURCE=demo \
    PORT=8100
EXPOSE 8100

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD python -c "import urllib.request,os,sys; sys.exit(0 if urllib.request.urlopen(f\"http://127.0.0.1:{os.environ['PORT']}/health\").status==200 else 1)"

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
