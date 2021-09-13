const CardNotActivated = require("../helpers/CardNotActivated");
const InsufficientLimit = require("../helpers/InsufficientLimit");
const AccountAlreadyInitialized = require("../helpers/AccountAlreadyInitialized");
const HighFrequencySmallInterval = require("../helpers/HighFrequencySmallInterval");
const DoubledTransaction = require("../helpers/DoubledTransaction");

class Account {
    constructor(isCardActived, availableLimit) {
        if(Account._instance) {
            throw new AccountAlreadyInitialized();
        }

        Account._instance = this;

        this.isCardActived = isCardActived;
        this.availableLimit = availableLimit;
        this.transactions = [];
    }        
    
    addTransaction(transaction) {                     
        if (!this.isCardActived) throw new CardNotActivated();        
        if (transaction.amount > this.availableLimit) throw new InsufficientLimit();

        const currentTransactionTime = new Date(transaction.time);
        
        const recentlyTransactions = this.transactions.filter((transaction) => {
            const pastTransactionTime = new Date(transaction.time);

            const timeElapsed = currentTransactionTime - pastTransactionTime;            
            
            return timeElapsed <= 120000;
        });            
            
        if (recentlyTransactions.length > 3) throw new HighFrequencySmallInterval();
        if (recentlyTransactions.some((pastTransaction) =>
            pastTransaction.merchant === transaction.merchant 
            && pastTransaction.amount === transaction.amount)) {
                throw new DoubledTransaction();
            }

        this.availableLimit = this.availableLimit - transaction.amount;
        this.transactions.push(transaction);        
    }        

    getIsCardActive() {
        return this.isCardActived;
    }

    getAvailableLimit() {
        return this.availableLimit;
    }
}

module.exports = Account;