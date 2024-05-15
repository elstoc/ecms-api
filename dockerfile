FROM node:hydrogen-alpine3.16 AS BUILDER
ENV NODE_ENV development

RUN mkdir -p /app

COPY . ./app

WORKDIR ./app

RUN npm ci
RUN npm run build
RUN npm ci --omit=dev

#################

FROM node:hydrogen-alpine3.16
ENV NODE_ENV production

RUN apk update
RUN apk add --no-cache graphicsmagick

RUN mkdir -p /app/data

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/api/api.spec.yaml ./dist/api/api.spec.yaml
COPY --from=builder /app/node_modules ./node_modules

CMD node ./dist/index.js
