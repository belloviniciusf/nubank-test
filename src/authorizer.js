const readline = require('readline');
const Account = require('./models/Account');
const Validator = require('./models/Validator');
const Task = require('./models/Task');
const businessRules = require('./helpers/businessRules');
const OPERATIONS_TYPE = require('./enums/operationsType');
const readlineInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const receiveMessage = (message) => {
    if (message.account) return { type: OPERATIONS_TYPE.ACCOUNT, message: message.account };
    else return { type: OPERATIONS_TYPE.TRANSACTION, message: message.transaction };
};

const processMessage = (operation) => {
    const currentAccount = Account.getInstance();

    const validator = new Validator(businessRules);

    const violations = validator.validate(currentAccount, operation.type, operation.message);        

    switch(operation.type) {
        case OPERATIONS_TYPE.ACCOUNT:   {
            const account = operation.message;

            new Account(account['active-card'], account['available-limit']);        

            break;
        }                                 
        case OPERATIONS_TYPE.TRANSACTION: {
            if (violations.length > 0) break;

            const transaction = operation.message;            

            currentAccount.addTransaction(transaction);

            break;
        }                                     
        default:
            break;
    }        

    const currentInstance = Account.getInstance();

    const account = currentInstance ? currentInstance.getLogMessage() : {};    

    return {
        account,
        violations,
    }
};

function start() {
    const task = new Task();    

    readlineInterface.on('line', function (command) {
        const jsonCommand = JSON.parse(command);

        task.addOperation(jsonCommand)   
    }).on('close', () => {
        const operations = task.getOperations();

        const output = operations.map((operation) => {
            const processedMessage = receiveMessage(operation);

            return processMessage(processedMessage);
        });

        output.map((log) => console.log(JSON.stringify(log, null)));    
    })
};

module.exports = {
    start,
    receiveMessage,
    processMessage
}
