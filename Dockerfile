FROM node:20-slim AS build
WORKDIR /app

COPY package.json package-lock.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/cloud_job/package.json apps/cloud_job/package.json
COPY apps/local_sync/package.json apps/local_sync/package.json
COPY shared/package.json shared/package.json
RUN npm ci

COPY . .
RUN npm run build --workspace=@apps/cloud_job

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/cloud_job/package.json apps/cloud_job/package.json
COPY --from=build /app/apps/cloud_job/dist apps/cloud_job/dist
COPY --from=build /app/shared/prompts shared/prompts
COPY --from=build /app/shared/skills shared/skills

CMD ["node", "apps/cloud_job/dist/main.js"]
