const MOCK_ACCOUNT_DATA = {    
    account: {
        "active-card": true, 
        "available-limit": 175
    }
};

const MOCK_TRANSACTION_DATA = {
    transaction: {
        merchant: "Burger King",
        amount: 20,
        time: "2019-02-13T11:00:00.000Z"
    }
};

module.exports = {
    MOCK_ACCOUNT_DATA,
    MOCK_TRANSACTION_DATA
}