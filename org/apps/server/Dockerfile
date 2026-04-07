FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx nx build server

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist/apps/server ./dist
COPY --from=builder /app/dist/shared ./dist/shared
COPY package*.json ./
COPY tsconfig.base.json tsconfig.json   

RUN npm install --omit=dev

EXPOSE 3000

CMD ["node", "-r", "tsconfig-paths/register", "dist/src/main.js"]  