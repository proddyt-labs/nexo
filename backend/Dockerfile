# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npx tsc --noEmitOnError false || true

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist            ./dist
COPY --from=builder /app/node_modules/.prisma  ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma  ./node_modules/@prisma
COPY prisma ./prisma

EXPOSE 3200

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/index.js"]
