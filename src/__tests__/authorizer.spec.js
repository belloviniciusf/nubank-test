const { describe, expect, it } = require("@jest/globals");
const OPERATIONS_TYPE = require("../enums/operationsType");

const { receiveMessage, processMessage } = require('../authorizer');
const { MOCK_ACCOUNT_DATA, MOCK_TRANSACTION_DATA } = require(".");

describe('authorizer', () => {    
    describe('receiveMessage', () => {
        it('returns a message of "account" type', () => {                
            const processedMessage = receiveMessage(MOCK_ACCOUNT_DATA); 

            expect(processedMessage.type).toBe(OPERATIONS_TYPE.ACCOUNT);
        });

        it('returns a message of "transaction" type', () => {            
            const processedMessage = receiveMessage(MOCK_TRANSACTION_DATA); 

            expect(processedMessage.type).toBe(OPERATIONS_TYPE.TRANSACTION);
        });
    });

    describe('processMessage', () => {
        it('creates successfully an account', () => {
            const operation = {
                type: OPERATIONS_TYPE.ACCOUNT,
                message: MOCK_ACCOUNT_DATA.account
            }

            const receivedResponse = processMessage(operation);

            expect(receivedResponse).toStrictEqual({ account: MOCK_ACCOUNT_DATA.account, violations: [] });
        });
    });
})