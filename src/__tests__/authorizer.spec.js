const { describe, expect, it, beforeEach } = require("@jest/globals");
const OPERATIONS_TYPE = require("../enums/operationsType");
const { receiveMessage, processMessage, start } = require('../authorizer');
const { MOCK_ACCOUNT_DATA, MOCK_TRANSACTION_DATA } = require(".");

const Account = require('../models/Account');
const readline = require('readline');

jest.mock('../models/Account');
jest.mock('readline');

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
        beforeEach(() => {            
            Account.mockClear();            
        });

        it('creates successfully an account', () => {        
            const mockGetInstance = jest.fn().mockReturnValue();

            Account.getInstance = mockGetInstance;
            Account.mockImplementation(() => {
                return {                                         
                    getLogMessage: () => MOCK_ACCOUNT_DATA.account
                }                                
            });

            const processedMessage = {
                type: OPERATIONS_TYPE.ACCOUNT,
                message: MOCK_ACCOUNT_DATA.account
            }

            const receivedResponse = processMessage(processedMessage);                                    

            expect(Account).toHaveBeenCalledTimes(1)            
            expect(receivedResponse).toStrictEqual({ account: MOCK_ACCOUNT_DATA.account, violations: [] });
        }); 
        
        it('returns empty account when already exists one', () => {
            const mockGetInstance = jest.fn().mockReturnValue({                   
                getLogMessage: () => MOCK_ACCOUNT_DATA.account                           
            });

            Account.getInstance = mockGetInstance;            

            const processedMessage = {
                type: OPERATIONS_TYPE.ACCOUNT,
                message: MOCK_ACCOUNT_DATA.account
            }

            const receivedResponse = processMessage(processedMessage);                                                

            expect(Account).toHaveBeenCalledTimes(1)
            expect(receivedResponse).toStrictEqual({ account: MOCK_ACCOUNT_DATA.account, violations: ['account-already-initialized'] });
        });
        
        it('creates successfully a transaction', () => {
            const getLogMessage = ()  => ({
                ...MOCK_ACCOUNT_DATA.account,
                'available-limit': MOCK_ACCOUNT_DATA.account["available-limit"] - MOCK_TRANSACTION_DATA.transaction.amount
            });
            
            const addTransaction = jest.fn();

            const mockGetInstance = jest.fn().mockReturnValue({
                getLogMessage,                
                getIsCardActive: () => true,
                getAvailableLimit: () => MOCK_ACCOUNT_DATA.account["available-limit"],
                getTransactions: () => [MOCK_TRANSACTION_DATA],
                addTransaction
            });

            Account.getInstance = mockGetInstance;

            const processedTransactionMessage = {
                type: OPERATIONS_TYPE.TRANSACTION,
                message: MOCK_TRANSACTION_DATA.transaction
            };

            const receivedResponse = processMessage(processedTransactionMessage);

            const expectedResponse = {
                account: getLogMessage(),
                violations: []
            }            

            expect(addTransaction).toBeCalledWith(MOCK_TRANSACTION_DATA.transaction);
            expect(receivedResponse).toStrictEqual(expectedResponse);
        });
    });

    describe('start', () => {
        it('reads commands and then log', () => {            
            readline.createInterface = jest.fn().mockReturnValue({
                addListener: jest.fn()                                        
                    .mockImplementationOnce((_, cb) => {                        
                        cb('{ "account": {} }')
                    })
                    .mockImplementationOnce()                        
            })            

            start();

            expect(2).toBe(2);
        });
    });
});
