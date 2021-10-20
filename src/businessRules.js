const OPERATIONS_TYPE = require('./enums/operationsType');

const twoMinutesMilliseconds = 120000;

const rules = {
    [OPERATIONS_TYPE.ACCOUNT]: [
        {
            hasSomeViolation: (instance) => instance,              
            violation: 'account-already-initialized'
        },
    ],
    [OPERATIONS_TYPE.TRANSACTION]: [
        {
            hasSomeViolation: (instance) => !instance,                
            violation: 'account-not-initialized',
            break: true,
        },
        {
            hasSomeViolation: (instance) => {
                return !instance?.getIsCardActive();
            },
            violation: 'card-not-active'
        },
        {
            hasSomeViolation: (instance, transaction) => {                            
                return transaction?.amount > instance?.getAvailableLimit();
            },
            violation: 'insufficient-limit'
        },
        {
            hasSomeViolation: (instance, transaction) => {                                        
                const accountTransactions = instance?.getTransactions();
                const currentTransactionTime = new Date(transaction?.time);
        
                const recentlyTransactions = accountTransactions?.filter((pastTransaction) => {
                    const pastTransactionTime = new Date(pastTransaction?.time);
            
                    const timeElapsed = currentTransactionTime - pastTransactionTime;            
                        
                    return timeElapsed <= twoMinutesMilliseconds;
                });
    
                return recentlyTransactions?.length >= 3;
            },
            violation: 'high-frequency-small-interval'
        },
        {
            hasSomeViolation: (instance, transaction) => {                                    
                const accountTransactions = instance.getTransactions();
                const currentTransactionTime = new Date(transaction?.time);
    
                const recentlyTransactions = accountTransactions?.filter((transaction) => {
                    const pastTransactionTime = new Date(transaction?.time);
            
                    const timeElapsed = currentTransactionTime - pastTransactionTime;            
                        
                    return timeElapsed <= twoMinutesMilliseconds
                });        
    
                return recentlyTransactions?.some((pastTransaction) => 
                    pastTransaction?.merchant === transaction?.merchant &&
                    pastTransaction?.amount === transaction?.amount)                    
            },
            violation: 'doubled-transaction'
        }
    ],
    [OPERATIONS_TYPE['ALLOW-LIST']]: [
        {
            hasSomeViolation: (instance) => {                
                return !instance?.getIsCardActive();
            },
            violation: 'card-not-active'
        },
        {
            hasSomeViolation: (instance, transaction) => {                            
                return transaction?.amount > instance?.getAvailableLimit();
            },
            violation: 'insufficient-limit'
        },
    ]
}

module.exports = rules;    