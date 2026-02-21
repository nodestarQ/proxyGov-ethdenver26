FROM node:22-alpine

RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN echo "onlyBuiltDependencies:" > .npmrc || true
RUN pnpm install --config.onlyBuiltDependencies="better-sqlite3" --frozen-lockfile 2>/dev/null || pnpm install --config.onlyBuiltDependencies="better-sqlite3"
RUN ls -la node_modules/.pnpm/better-sqlite3*/node_modules/better-sqlite3/build/ 2>/dev/null || echo "NO BUILD DIR FOUND"
RUN npx --yes node-gyp rebuild --directory=node_modules/.pnpm/better-sqlite3@11.10.0/node_modules/better-sqlite3 2>&1 || true
RUN pnpm rebuild better-sqlite3 2>&1 || true
RUN ls -la node_modules/.pnpm/better-sqlite3*/node_modules/better-sqlite3/build/Release/ 2>/dev/null || echo "STILL NO .node FILE"

COPY dist/ ./dist/

ENV NODE_ENV=production
ENV PORT=3004

EXPOSE 3004

CMD ["node", "dist/backend/src/index.js"]
