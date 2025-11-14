FROM alpine:latest as builder
RUN apk add --no-cache git
RUN mkdir /jwt2header
RUN git clone https://github.com/yesinteractive/kong-jwt2header.git /jwt2header

FROM kong:3.4-ubuntu
USER root
RUN mkdir /usr/local/share/lua/5.1/kong/plugins/kong-jwt2header
COPY --from=builder  /jwt2header/plugin/. /usr/local/share/lua/5.1/kong/plugins/kong-jwt2header
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
USER kong
ENTRYPOINT ["/entrypoint.sh"]
