class HighFrequencySmallInterval extends Error {
    constructor(message) {
        super(message);
        this.message = message;
        this.violation = 'high-frequency-small-interval"';
    }
}

module.exports = HighFrequencySmallInterval;