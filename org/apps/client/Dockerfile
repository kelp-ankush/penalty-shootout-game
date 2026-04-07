FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx nx build client

FROM nginx:alpine

COPY --from=builder /app/dist/apps/client /usr/share/nginx/html

COPY apps/client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]