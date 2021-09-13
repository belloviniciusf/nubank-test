class DoubledTransaction extends Error {
    constructor(message) {
        super(message);
        this.message = message;
        this.violation = 'doubled-transaction';
    }
}

module.exports = DoubledTransaction;