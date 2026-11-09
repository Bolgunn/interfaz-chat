FROM node:22-alpine AS build
WORKDIR /code
COPY ./app/package.json ./app/package-lock.json ./
RUN npm ci
COPY ./app/ ./
RUN npm run build

# Imagen sin root (puerto 8080) para cumplir la política "restricted" del clúster.
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY --from=build /code/dist /usr/share/nginx/html
# El navegador usa /graphql del mismo origen; nginx lo reenvía al Service `gateway`
# (en docker-compose y en Kubernetes se llama igual).
COPY <<'CONF' /etc/nginx/conf.d/default.conf
server {
    listen 8080;
    root /usr/share/nginx/html;
    location = /graphql {
        proxy_pass http://gateway:5000/graphql;
        proxy_set_header Host $host;
        proxy_read_timeout 30s;
    }
    location / {
        try_files $uri /index.html;
    }
}
CONF
