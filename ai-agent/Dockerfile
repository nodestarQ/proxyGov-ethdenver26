FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY dist/ ./dist/

ENV NODE_ENV=production
ENV AI_AGENT_PORT=3001

EXPOSE 3001

CMD ["node", "dist/index.js"]
