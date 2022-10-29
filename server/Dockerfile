# syntax=docker/dockerfile:1
FROM node:18 AS build
WORKDIR /server
COPY package* yarn.lock ./
COPY src ./src
RUN yarn install && yarn build
CMD ["node", "./build/chatsino"]