# One image for the API and the worker (SDD D9). docker-compose.yml picks the command for each service.
FROM node:22.14.0-alpine

ENV TZ=Asia/Ho_Chi_Minh
RUN apk add --no-cache tzdata
WORKDIR /app

# Install production dependencies of the api and worker workspaces only (the web app is not needed here).
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY apps/web/package.json apps/web/
COPY packages/core/package.json packages/core/
RUN npm ci --omit=dev --workspace @stocksense/api --workspace @stocksense/worker --include-workspace-root=false \
  && npm cache clean --force

COPY packages/core packages/core
COPY mocks mocks
COPY db db
COPY apps/api apps/api
COPY apps/worker apps/worker

USER node
