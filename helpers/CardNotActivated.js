class CardNotActivated extends Error {
    constructor(message) {
        super(message);
        this.message = message;
        this.violation = 'card-not-active';
    }
}

module.exports = CardNotActivated;