# Build image
FROM node:14 as builder
WORKDIR /app
COPY . /app
RUN npm ci
RUN npm run build
RUN npm ci --production

# Production image
FROM node:14-slim
WORKDIR /app
USER node
COPY --from=builder --chown=node /app/dist ./dist/
COPY --from=builder --chown=node /app/node_modules ./node_modules/
COPY --chown=node package* ./
