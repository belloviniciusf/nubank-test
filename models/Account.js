class Account {
    constructor(isCardActived, availableLimit) {
        if(Account._instance) {
            return Account._instance;
        }

        Account._instance = this;        

        this.isCardActived = isCardActived;
        this.availableLimit = availableLimit;
        this.currentTransaction = {};
        this.transactions = [];
    }        

    static getInstance() {
        return Account._instance;
    }
    
    addTransaction(transaction) {     
        this.setAvailableLimit(this.availableLimit - transaction.amount);        
        this.setTransactions([...this.transactions, transaction]);        
    }        

    getIsCardActive() {
        return this.isCardActived;
    }

    setAvailableLimit(availableLimit) {
        this.availableLimit = availableLimit;
    }

    getAvailableLimit() {
        return this.availableLimit;
    }

    setTransactions(transactions) {
        this.transactions = transactions;
    } 

    getTransactions() {
        return this.transactions;
    }    

    getLogMessage() {                
        return {            
            'active-card': this.getIsCardActive(),
            'available-limit': this.getAvailableLimit(),
        }
    }
}

module.exports = Account;