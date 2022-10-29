# syntax=docker/dockerfile:1
FROM node:18 AS build
WORKDIR /client
COPY client/package* client/yarn.lock ./
RUN yarn install
COPY client/public ./public
COPY client/src ./src
COPY client/tsconfig.json ./tsconfig.json
RUN yarn run build

FROM nginx:alpine
COPY --from=build /client/build /usr/share/nginx/html