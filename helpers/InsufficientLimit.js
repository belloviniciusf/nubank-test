class InsufficientLimit extends Error {
    constructor(message) {
        super(message);
        this.message = message;
        this.violation = 'insufficient-limit"';
    }
}

module.exports = InsufficientLimit;