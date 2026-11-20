# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# ATMTL 2026 · Bénévoles — image Nginx statique (Cloud Run, port 8080)
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="ATMTL 2026 - Benevoles" \
      org.opencontainers.image.description="Planning hors-ligne des benevoles de l'Agile Tour Montreal 2026" \
      org.opencontainers.image.source="https://github.com/florianley/ATMTL-2026-benevoles"

# Configuration Nginx (port 8080, gzip, cache, en-têtes de sécurité)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Application statique
COPY index.html             /usr/share/nginx/html/index.html
COPY sw.js                  /usr/share/nginx/html/sw.js
COPY manifest.webmanifest   /usr/share/nginx/html/manifest.webmanifest
COPY icon.svg               /usr/share/nginx/html/icon.svg
COPY icon-192.png           /usr/share/nginx/html/icon-192.png
COPY icon-512.png           /usr/share/nginx/html/icon-512.png
COPY icon-maskable-512.png  /usr/share/nginx/html/icon-maskable-512.png
COPY apple-touch-icon.png   /usr/share/nginx/html/apple-touch-icon.png

# La page d'accueil par défaut de l'image nginx est remplacée par index.html
RUN rm -f /usr/share/nginx/html/index.nginx-debian.html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
