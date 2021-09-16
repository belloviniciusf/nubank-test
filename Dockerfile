FROM node:14

COPY . /app

WORKDIR /app

RUN npm install .
RUN npm link

ENTRYPOINT ["/usr/local/bin/authorizer"]
