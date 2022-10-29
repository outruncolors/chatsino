# syntax=docker/dockerfile:1
FROM node:18 AS build
WORKDIR /client
COPY package* yarn.lock ./
RUN yarn install
COPY public ./public
COPY src ./src
COPY tsconfig.json ./tsconfig.json
RUN yarn build

FROM nginx:alpine
COPY --from=build /client/build /usr/share/nginx/html