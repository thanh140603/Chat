# syntax=docker/dockerfile:1
FROM eclipse-temurin:17-jre as runtime

ARG JAR_FILE=target/*.jar
WORKDIR /app
COPY ${JAR_FILE} app.jar

ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75.0 -XX:+UseG1GC"
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]

