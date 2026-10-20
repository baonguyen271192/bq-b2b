# Backend BQ (Java) — dùng khi cần tự host trong mạng nội bộ của BQ, bắt buộc nếu
# SAP B1 Service Layer không mở ra Internet. Build từ GỐC repo:
#   docker build -f apps/api-java/Dockerfile -t bq-api-java .

# --- Giai đoạn build -------------------------------------------------------
FROM eclipse-temurin:21-jdk AS build
WORKDIR /build

# Copy wrapper + pom trước để tầng cache dependency không vỡ khi sửa code.
COPY apps/api-java/.mvn/ .mvn/
COPY apps/api-java/mvnw apps/api-java/pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline

COPY apps/api-java/src ./src
RUN ./mvnw -B -q package -DskipTests

# --- Giai đoạn chạy --------------------------------------------------------
# JRE thay vì JDK: ảnh nhỏ hơn và bớt công cụ không cần trong production.
FROM eclipse-temurin:21-jre
WORKDIR /srv

COPY --from=build /build/target/*.jar app.jar

# Chạy bằng user thường thay vì root.
RUN useradd --create-home --uid 10001 bq && chown -R bq:bq /srv
USER bq

ENV BQ_DATA_SOURCE=demo \
    PORT=8100
EXPOSE 8100

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \
  CMD ["sh", "-c", "wget -qO- http://127.0.0.1:${PORT}/health || exit 1"]

ENTRYPOINT ["sh", "-c", "exec java -jar app.jar"]
