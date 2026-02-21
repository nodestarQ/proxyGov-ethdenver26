FROM node:22-alpine

RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile 2>/dev/null || pnpm install --prod
RUN pnpm rebuild better-sqlite3

COPY dist/ ./dist/

ENV NODE_ENV=production
ENV PORT=3004

EXPOSE 3004

CMD ["node", "dist/backend/src/index.js"]
