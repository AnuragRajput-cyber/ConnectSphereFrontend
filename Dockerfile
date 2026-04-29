FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN mkdir -p /opt/webroot && \
    if [ -d /app/dist/connectsphere-web/browser ]; then cp -r /app/dist/connectsphere-web/browser/. /opt/webroot/; else cp -r /app/dist/connectsphere-web/. /opt/webroot/; fi

FROM nginx:1.27-alpine
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /opt/webroot /usr/share/nginx/html
EXPOSE 80
ENTRYPOINT ["nginx", "-g", "daemon off;"]
