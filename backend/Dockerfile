FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /build
COPY . .
RUN mvn -B -f backend/pom.xml -Pseata,monitor -DskipTests package
ARG MODULE
RUN if [ "$MODULE" = product-service ]; then cp target/product-service-1.0.0.jar /build/app.jar; else cp backend/$MODULE/target/$MODULE-1.0.0.jar /build/app.jar; fi
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
USER app
# 运行用户没有可写 home，显式把 Nacos 本地缓存放到 /tmp，避免服务发现失败。
ENV JAVA_TOOL_OPTIONS="-DJM.SNAPSHOT.PATH=/tmp"
COPY --from=build /build/app.jar app.jar
EXPOSE 8080 8081 8082 8083 8090
ENTRYPOINT ["java","-jar","app.jar"]
