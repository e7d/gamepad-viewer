FROM alpine:3.21 AS build
RUN apk add --no-cache brotli gzip
WORKDIR /src
COPY index.html favicon.ico favicon.png ./
COPY css ./css
COPY js ./js
COPY templates ./templates
RUN find . -type f \( -name '*.html' -o -name '*.css' -o -name '*.js' -o -name '*.svg' \) -print0 \
    | while IFS= read -r -d '' f; do \
        gzip -9 -k "$f"; \
        brotli -q 11 -k "$f"; \
    done

FROM alpine:3.21 AS serve
RUN apk add --no-cache nginx nginx-mod-http-brotli
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /src /usr/share/nginx/html
RUN nginx -t
USER nginx
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
