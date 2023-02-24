FROM node:hydrogen-alpine3.16 AS BUILDER
ENV NODE_ENV development

RUN ["mkdir", "-p", "/app"]

COPY . ./app

WORKDIR ./app

RUN npm ci
RUN npm run build
RUN npm ci --omit=dev

FROM node:hydrogen-alpine3.16
ENV NODE_ENV production

RUN apk update
RUN apk add --no-cache graphicsmagick
RUN mkdir -p /app

COPY --from=builder --chown=node:node /app/dist /app/dist
COPY --from=builder --chown=node:node /app/node_modules /app/node_modules

USER node
WORKDIR /app

CMD node ./dist/index.js
