# Nubank - Code Challenge
## Run by Docker (recomendable)

1. You first must to build the image from project
`docker build -t authorizer .`

2. After that you can run as standalone command, such example: 
`docker run -i authorizer < examples/operations-account-already-initialized`

## Run without Docker

```
  npm install
  npm link
  authorizer < examples/operations-account-not-initialized
```

## Run tests

```
  npm install
  npm test
```