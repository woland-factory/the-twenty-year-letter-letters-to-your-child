# Stage 1: build the single-file artifact and the landing template.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:artifact

# Stage 2: a tiny static server. No node_modules, no build tools. The server
# and the site assembler use Node built-ins only, so the image stays small.
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/site/index.html ./site/index.html
COPY --from=build /app/site/styles.css ./site/styles.css
COPY --from=build /app/scripts/prepare-site.mjs ./scripts/prepare-site.mjs
COPY --from=build /app/scripts/serve-site.mjs ./scripts/serve-site.mjs
COPY --from=build /app/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
COPY --from=build /app/package.json ./package.json
RUN chmod +x scripts/docker-entrypoint.sh
EXPOSE 80
CMD ["sh", "scripts/docker-entrypoint.sh"]
