# Stage 1: Dependencies
FROM node:22-alpine3.21 AS deps
RUN apk update && apk upgrade --no-cache && apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Stage 2: Build
FROM node:22-alpine3.21 AS builder
RUN apk update && apk upgrade --no-cache
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars must be set at build time — Next.js bakes them into the bundle
ENV NEXT_PUBLIC_API_URL=https://cdl-rates-api-5apyjq-58ba8d-89-116-27-144.traefik.me/api
ENV NEXT_PUBLIC_APP_URL=https://cdl-rates-fx-ff7mlh-565798-89-116-27-144.traefik.me
ENV NEXT_PUBLIC_WC_PROJECT_ID=092f1acfa68aa7adf15fbeefb9a84786
ENV NEXT_PUBLIC_OPERATOR_ADDRESS=0x4f8f56034E0444b143C22d95EbC760Fe7E287217
ENV NEXT_PUBLIC_TOKEN_ADDRESS=0x55d398326f99059fF775485246999027B3197955
ENV NEXT_PUBLIC_TOKEN_SYMBOL=USDT

RUN npm run build

# Stage 3: Runner
FROM node:22-alpine3.21 AS runner
RUN apk update && apk upgrade --no-cache
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Standalone output for minimal runtime
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
