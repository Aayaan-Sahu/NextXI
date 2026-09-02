# cricket-platform (Next.js) production image for self-hosting.
# Build from the repo root:  docker build -t nextxi-web .
#
# All three stages use the same bun/debian base so the Prisma query engine
# generated in `builder` is binary-compatible with the `runner` it's copied
# into (Prisma's default `binaryTargets = ["native"]` only works that way).

FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bunx prisma generate
RUN bun run build

FROM oven/bun:1 AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Belt-and-suspenders: Next's file tracer sometimes misses Prisma's engine
# binary since it lives outside node_modules (custom `output` in schema.prisma).
COPY --from=builder --chown=nextjs:nodejs /app/app/generated/prisma ./app/generated/prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["bun", "server.js"]
