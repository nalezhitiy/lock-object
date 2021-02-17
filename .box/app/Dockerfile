FROM node:15.3.0-alpine3.10

RUN apk add --no-cache tzdata
ENV TZ="Europe/Kiev"

ARG USER_NAME=node
ARG USER_ID=1000
ARG WORKDIR=/app

WORKDIR $WORKDIR

USER $USER_NAME

EXPOSE 3000
