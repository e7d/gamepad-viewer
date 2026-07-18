FROM alpine:3.21 AS compress
RUN apk add --no-cache brotli gzip
WORKDIR /public
COPY index.html site.webmanifest browserconfig.xml ./
COPY favicon.ico favicon-16x16.png favicon-32x32.png apple-touch-icon.png ./
COPY android-chrome-192x192.png android-chrome-512x512.png mstile-150x150.png safari-pinned-tab.svg ./
COPY css ./css
COPY js ./js
COPY templates ./templates
RUN find . -type f \( -name '*.html' -o -name '*.css' -o -name '*.js' -o -name '*.svg' \) -print0 \
    | while IFS= read -r -d '' f; do \
        gzip -9 -k "$f"; \
        brotli -q 11 -k "$f"; \
    done

FROM scratch AS base
COPY --from=ghcr.io/static-web-server/static-web-server:2.43.0@sha256:6acea6260b14e08dda986361e42640082fbfaab8d88c327de532bb13a3b22994 /static-web-server /static-web-server
COPY sws.toml /sws.toml
USER 65534:65534
EXPOSE 8080
ENTRYPOINT ["/static-web-server", "-w", "/sws.toml"]

FROM base AS dev

FROM base AS prod
COPY --from=compress /public /public
