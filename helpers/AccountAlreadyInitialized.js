class AccountAlreadyInitialized extends Error {
    constructor(message) {
        super(message);        
        this.message = message;
        this.violation = 'account-already-initialized';
    }
}

module.exports = AccountAlreadyInitialized;