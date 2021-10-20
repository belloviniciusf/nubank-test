class Account {
    constructor(isCardActived, availableLimit) {
        Account._instance = this;        

        this.isCardActived = isCardActived;
        this.availableLimit = availableLimit;        
        this.allowedList = false;
        this.transactions = [];

        return this;
    }        

    static getInstance() {
        return Account._instance;
    }
    
    addTransaction(transaction) {     
        this.setAvailableLimit(this.availableLimit - transaction.amount);        
        this.setTransactions([...this.transactions, transaction]);        
    }        

    setAllowedList(allowedList) {
        this.allowedList = allowedList;
    }

    getAllowedList() {
        return this.allowedList;
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
            'allowed-list': this.allowedList,
            'active-card': this.isCardActived,
            'available-limit': this.availableLimit
        }
    }
}

module.exports = Account;