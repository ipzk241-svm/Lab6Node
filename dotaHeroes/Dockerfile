FROM node:24 AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

FROM node:24

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev --legacy-peer-deps

COPY --from=builder /app/dist ./dist

EXPOSE 3000

USER node

CMD ["node", "dist/server.js"]