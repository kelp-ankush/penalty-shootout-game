FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json nx.json tsconfig.base.json ./
COPY apps/client ./apps/client
COPY shared ./shared

RUN npm install

RUN npx nx build shared

RUN npx nx build client --configuration=production

FROM nginx:alpine

COPY --from=builder /app/dist/apps/client /usr/share/nginx/html

COPY apps/client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80