const { describe, expect, it, beforeEach, afterEach, afterAll } = require("@jest/globals");
const OPERATIONS_TYPE = require("../enums/operationsType");
const { receiveMessage, processMessage, start } = require('../authorizer');
const { MOCK_ACCOUNT_DATA, MOCK_TRANSACTION_DATA } = require(".");

const Account = require('../models/Account');
const readline = require('readline');

jest.mock('../models/Account');
jest.mock('readline');

const setupReadlineInterface = (commands) => {
    readline.createInterface = jest.fn().mockReturnValue({
        addListener: jest.fn()                                        
            .mockImplementationOnce((_, cb) => {                        
                commands.map((command) => {
                    cb(JSON.stringify(command))
                })                        
            })                                        
            .mockImplementationOnce((_, cb) => {
                cb()
            })                        
    });    
};

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
        
        afterAll(() => {
            Account.mockClear();
            Account.getInstance = jest.fn().mockReturnValue();
        })

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
        beforeEach(() => {
            Account.mockClear();            
            console.log = jest.fn();
        })

        it('reads command and then log', () => {                           
            const commands = [
                { account: {} }
            ]

            Account.mockImplementation(() => {
                return {                                         
                    getLogMessage: () => MOCK_ACCOUNT_DATA.account
                }                                
            });

            setupReadlineInterface(commands);                    

            start();

            const expectedResponse = {
                account: MOCK_ACCOUNT_DATA.account,
                violations: []
            };            

            expect(console.log).toHaveBeenLastCalledWith(JSON.stringify(expectedResponse, null));
        });

        it('returns "account-already-initialized" violation when account already exists', () => {          
            const commands = [
                {"account": {"active-card": true, "available-limit": 175}},
                {"account": {"active-card": true, "available-limit": 350}}                   
            ];

            Account
                .mockImplementationOnce(() => { 
                    return { getLogMessage: () => MOCK_ACCOUNT_DATA.account } 
                })
                .mockImplementationOnce(() => { return { getLogMessage: () => ({
                    ...MOCK_ACCOUNT_DATA.account,
                    'available-limit': 350
                })}});

            const mockGetInstance = jest.fn()
                .mockReturnValueOnce()
                .mockReturnValueOnce({ 
                    getLogMessage: () => MOCK_ACCOUNT_DATA.account 
                });
            
            Account.getInstance = mockGetInstance;            

            setupReadlineInterface(commands);            

            start();                     

            expect(console.log).toBeCalledTimes(3);                        
                        
            expect(console.log).toHaveBeenNthCalledWith(2, 
                JSON.stringify({
                    account: {"active-card": true, "available-limit": 175},
                    violations: []
                }, null)
            );                    

            expect(console.log).toHaveBeenNthCalledWith(3, 
                JSON.stringify({
                    account: {"active-card": true, "available-limit": 350},
                    violations: ['account-already-initialized']
                }, null)
            );
        });

        it('returns "account-not-initialized" when try to a transaction without account', () => {
            const commands = [
                { transaction: { merchant: "Uber Eats", amount: 25, time: "2020-12-01T11:07:00.000Z"}},
                { account: { "active-card": true, "available-limit": 225 }},
                { transaction: { merchant: "Uber Eats", amount: 25, time: "2020-12-01T11:07:00.000Z"}}
            ];

            setupReadlineInterface(commands);            
            
            Account
                .mockImplementationOnce(() => { 
                    return {
                        getLogMessage: () => ({
                            ...MOCK_ACCOUNT_DATA.account,
                            'available-limit': 225
                        }
                )}});
            
            const mockGetInstance = jest.fn()
                .mockReturnValueOnce()                                          
                .mockReturnValueOnce()                
                .mockReturnValueOnce({ 
                    getLogMessage: () => ({
                        ...MOCK_ACCOUNT_DATA.account,
                        'available-limit': 200
                    }),
                    addTransaction: () => {} 
                });
            
            Account.getInstance = mockGetInstance;            

            start();

            expect(console.log).toBeCalledTimes(4);                        

            expect(console.log).toHaveBeenNthCalledWith(2, 
                JSON.stringify({
                    account: {},
                    violations:["account-not-initialized"],                    
                }, null)
            );
            expect(console.log).toHaveBeenNthCalledWith(3, 
                JSON.stringify({
                    account:{"active-card": true, "available-limit": 225},
                    violations:[]                                        
                }, null)
            );   
            expect(console.log).toHaveBeenNthCalledWith(4, 
                JSON.stringify({
                    "account":{"active-card":true,"available-limit": 200},
                    "violations":[]                    
                }, null)
            );            
        });
    });
});
