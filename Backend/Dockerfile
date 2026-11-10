FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node Server.js ./
COPY --chown=node:node src ./src
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node database/int.sql ./database/int.sql
USER node
EXPOSE 5000
HEALTHCHECK --interval=15s --timeout=8s --start-period=20s --retries=5 CMD ["node", "scripts/healthcheck.js"]
CMD ["node", "Server.js"]
