FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/cloud_job/package.json apps/cloud_job/package.json
COPY apps/local_sync/package.json apps/local_sync/package.json
COPY shared/package.json shared/package.json
# --include=dev so tsx is installed despite NODE_ENV=production
RUN npm ci --include=dev

COPY . .

CMD ["npx", "tsx", "apps/cloud_job/src/main.ts"]
