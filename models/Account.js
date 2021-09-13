const AccountAlreadyInitialized = require("../helpers/AccountAlreadyInitialized");
const transactionRules = require("../helpers/transactionRules");
const Validator = require('../models/Validator');

class Account {
    constructor(isCardActived, availableLimit) {
        if(Account._instance) {
            throw new AccountAlreadyInitialized();
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
        this.setCurrentTransaction(transaction);
        
        const validator = new Validator(transactionRules);

        const violations = validator.validate(this, transaction);        

        this.setCurrentTransaction({
            transaction,
            violations
        })
     
        if (violations.length > 0) return;

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

    setCurrentTransaction(transaction) {
        this.currentTransaction = transaction;                
    }

    getCurrentTransaction() {
        return this.currentTransaction;
    }

    setTransactions(transactions) {
        this.transactions = transactions;
    } 

    getTransactions() {
        return this.transactions;
    }    

    getLogMessage() {        
        const { transaction, violations } = this.getCurrentTransaction();

        return {
            transaction: {
                ...transaction,
                'available-limit': this.getAvailableLimit(),
            },
            violations,
        }
    }
}

module.exports = Account;