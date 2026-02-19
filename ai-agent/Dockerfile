FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile 2>/dev/null || pnpm install --prod

COPY dist/ ./dist/

ENV NODE_ENV=production
ENV AI_AGENT_PORT=3001

EXPOSE 3001

CMD ["node", "dist/index.js"]
