const readline = require('readline');
const Account = require('./models/Account');
const Validator = require('./models/Validator');
const Task = require('./models/Task');
const businessRules = require('./helpers/businessRules');
const OPERATIONS_TYPE = require('./enums/operationsType');

const receiveMessage = (message) => {    
    if (message.account) return { type: OPERATIONS_TYPE.ACCOUNT, message: message.account };            
    else return { type: OPERATIONS_TYPE.TRANSACTION, message: message.transaction };           
};

const processMessage = (operation) => {  
    let currentAccount = Account.getInstance();    
    
    const validator = new Validator(businessRules);

    const violations = validator.validate(currentAccount, operation.type, operation.message);        

    switch(operation.type) {
        case OPERATIONS_TYPE.ACCOUNT:   {
            const account = operation.message;
            
            currentAccount = new Account(account['active-card'], account['available-limit']);

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

    const account = currentAccount ? currentAccount.getLogMessage() : {};            

    return {
        account,
        violations,
    }
};

function start() {
    const task = new Task();    
    
    const readlineInterface = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });    

    readlineInterface.addListener('line', (command) => {
        const jsonCommand = JSON.parse(command);

        task.addOperation(jsonCommand);
    });

    readlineInterface.addListener('close', () => {
        const operations = task.getOperations();        

        const output = operations.map((operation) => {
            const processedMessage = receiveMessage(operation);

            return processMessage(processedMessage);
        });                

        console.log('\r');
        output.map((log) => console.log(JSON.stringify(log, null)));    
    })    
};

module.exports = {
    start,
    receiveMessage,
    processMessage
}
