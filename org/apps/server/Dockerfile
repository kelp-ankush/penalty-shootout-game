FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json nx.json tsconfig.base.json ./
COPY apps/server ./apps/server
COPY shared ./shared

RUN npm install

RUN npx nx build shared

RUN npx nx build server --configuration=production

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev \
    && npm cache clean --force

COPY --from=builder /app/dist/apps/server ./dist
COPY --from=builder /app/dist/shared ./dist/shared
COPY tsconfig.base.json tsconfig.json   

EXPOSE 3000