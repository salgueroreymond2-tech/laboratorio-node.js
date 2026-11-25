FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node scripts/seed-demo.js ./scripts/seed-demo.js
COPY --chown=node:node scripts/migrate.js ./scripts/migrate.js
COPY --chown=node:node migrations ./migrations
USER node
CMD ["node", "src/server.js"]
