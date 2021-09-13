const transactionRules = [
    {
        hasSomeViolation: (instance) => {                        
            return !instance.isCardActived;
        },
        violation: 'card-not-active'
    },
    {
        hasSomeViolation: (instance, transaction) => {        
            return transaction.amount > instance.getAvailableLimit();
        },
        violation: 'insufficient-limit'
    },
    {
        hasSomeViolation: (instance, transaction) => {            
            const currentTransactions = instance.getTransactions();
            const currentTransactionTime = new Date(transaction.time);

            const recentlyTransactions = currentTransactions.filter((transaction) => {
                const pastTransactionTime = new Date(transaction.time);
        
                const timeElapsed = currentTransactionTime - pastTransactionTime;            
                    
                return timeElapsed <= 120000;
            });                                           

            return recentlyTransactions.length > 3;
        },
        violation: 'high-frequency-small-interval'
    },
    {
        hasSomeViolation: (instance, transaction) => {                    
            const currentTransactions = instance.getTransactions();
            const currentTransactionTime = new Date(transaction.time);

            const recentlyTransactions = currentTransactions.filter((transaction) => {
                const pastTransactionTime = new Date(transaction.time);
        
                const timeElapsed = currentTransactionTime - pastTransactionTime;            
                    
                return timeElapsed <= 120000
            });        

            return recentlyTransactions.some((pastTransaction) => 
                pastTransaction.merchant === transaction.merchant &&
                pastTransaction.amount === transaction.amount)                    
        },
        violation: 'doubled-transaction'
    }
];

module.exports = transactionRules;