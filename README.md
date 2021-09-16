# Nubank - Code Challenge

This challenge is part of job process from Nubank. It was necessary to make an application which authorizes transactions for a specific account following a set of predefined rules. 

## Technologies
- **NodeJS** - I chose to use it because I am used to and its where I feel more comfortable. Besides this the Node works good in these problems involving emit of events.
- **Javascript** - I think it will be better to use Typescript to avoid writing errors and improve the maintenance, but the challenge recommend do not use dependencies, I chose to use Vanilla.
- **Jest** - It is to make the tests. I chose Jest because its the tool that I most use to and I had experience working with Models mock using it.

## Disclaimer

The `Authorizer` its an application that looks similar to a messaging queue, in my opinion. Its receive data, process it independently even has the data is not useful and delivery result. Therefore, I chose to think about the solution in these steps:

  - Receive all data and saved it as `operations`;
  - Transform it in common object that `Authorizer` could know what kind of data is (`account/transaction`);
  - Process these formatted messages applying the business rules.
    
I decided to divide the generical and individual parts to better enjoy the process, so if `Authorizer` in the future must process another kind of data, it is only necessary to understand what is generical/individual and put correctly in each step.

I created 3 models:
  - **Account** - It has some getters/setters, a method to do a transaction and another one to get a log message.
  - **Task** - It is a helpful model to store the operations.
  - **Validator** - It is a generic validator to apply the business rules.
The business rules are compiled in a individual file cause it is something shared to the project. It is a object [key: value] that enables easily add, modify or delete some rule from kind of data.

--- 

## Run by Docker (recomendable)

1. You first must to build the image from project
`docker build -t authorizer .`

2. After that you can run as standalone command, such example: 
`docker run -i authorizer < examples/operations-account-already-initialized`

## Run without Docker

You must have [Node 14](https://nodejs.org/en/) installed to run the project. 

1. Install dependencies 
`npm install`

2. Create standalone command
`npm link`

3. Execute the commands
`authorizer < examples/operations-account-not-initialized`

## Run tests

1. Make sure dependencies is already installed
`npm install`

2. Run the tests
`npm test`
