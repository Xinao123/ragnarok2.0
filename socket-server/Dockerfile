FROM node:20-alpine
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm i

COPY . .
RUN pnpm build

EXPOSE 4000
CMD ["pnpm", "start"]
