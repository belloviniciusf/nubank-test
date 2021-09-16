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

const defaultAccountInstanceMethods = () => {
    return {
        getLogMessage: () => MOCK_ACCOUNT_DATA.account,                
        getIsCardActive: () => true,
        getAvailableLimit: () => MOCK_ACCOUNT_DATA.account["available-limit"],
        getTransactions: () => [MOCK_TRANSACTION_DATA],
        addTransaction: () => {},        
    }
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
        
        afterEach(() => {
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
        
        it('returns "account-already-initialized" when already exists one account', () => {
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

        it('returns empty when is a kind of operation unknown', () => {            
            const processedMessage = {
                type: 'something',
                message: {}
            }

            const receivedResponse = processMessage(processedMessage);                                                
            
            expect(receivedResponse).toStrictEqual({ account: {}, violations: [] });            
        })
        
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
            Account.getInstance = jest.fn().mockReturnValue();            
        })

        afterEach(() => {
            Account.mockClear();
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
                {account: {"active-card": true, "available-limit": 175}},
                {account: {"active-card": true, "available-limit": 350}}                   
            ];

            setupReadlineInterface(commands);

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

        it.skip('returns "account-not-initialized" when try to a transaction without account', () => {
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
        
        it('returns "card-not-active" when try to a transaction without actived card', () => {            
            const commands = [
                { account : {"active-card": false, "available-limit": 100 } },
                { transaction: {merchant: "Burger King2", amount: 20, time: "2019-02-13T11:00:00.000Z"} },
                { transaction: {merchant: "Habbib's2", amount: 15, time: "2019-02-13T11:15:00.000Z"} }
            ];

            setupReadlineInterface(commands);            
            
            Account
                .mockImplementationOnce(() => { 
                    return {
                        getLogMessage: () => ({
                            'active-card': false,
                            'available-limit': 100
                        }),     
                        getIsCardActive: () => false,                                       
                    }
                });
            
            const mockGetInstance = jest.fn()
                .mockReturnValueOnce()
                .mockReturnValueOnce({      
                    ...defaultAccountInstanceMethods(),            
                    getLogMessage: () => ({
                        'active-card': false,
                        'available-limit': 100
                    }),                        
                    getIsCardActive: () => false,                    
                })                
                .mockReturnValueOnce({ 
                    ...defaultAccountInstanceMethods(),            
                    getLogMessage: () => ({
                        'active-card': false,
                        'available-limit': 100
                    }),                    
                    getIsCardActive: () => false,                    
                });
            
            Account.getInstance = mockGetInstance;            

            start();

            // expect(console.log).toBeCalledTimes(4);                        

            expect(console.log).toHaveBeenNthCalledWith(2, 
                JSON.stringify({
                    account: { "active-card": false, "available-limit": 100 },
                    violations:[],                    
                }, null)
            );

            expect(console.log).toHaveBeenNthCalledWith(3, 
                JSON.stringify({
                    account: { "active-card": false, "available-limit": 100 },
                    violations: ['card-not-active'],                    
                }, null)
            );

            // expect(console.log).toHaveBeenNthCalledWith(4, 
            //     JSON.stringify({
            //         account: { "active-card": false, "available-limit": 100 },
            //         violations: ['card-not-active'],                    
            //     }, null)
            // );            
        });

        it('returns "insufficient-limit" when try to do transaction without sufficient limit', () => {
            const commands = [
                { account: {"active-card": true, "available-limit": 1000 }},
                { transaction: {"merchant": "Vivara", "amount": 1250, "time": "2019-02-13T11:00:00.000Z" }},
                { transaction: {"merchant": "Samsung", "amount": 2500, "time": "2019-02-13T11:00:01.000Z" }},
                { transaction: {"merchant": "Nike", "amount": 800, "time": "2019-02-13T11:01:01.000Z" }}                
            ];

            setupReadlineInterface(commands);            
            
            Account
                .mockImplementationOnce(() => { 
                    return {
                        getLogMessage: () => ({
                            'active-card': true,
                            'available-limit': 1000
                        }),
                    }
                });
            
            const mockGetInstance = jest.fn()
                .mockReturnValueOnce()
                .mockReturnValueOnce({      
                    ...defaultAccountInstanceMethods(),            
                    getLogMessage: () => ({
                        'active-card': true,
                        'available-limit': 1000
                    }),                    
                    getAvailableLimit: () => 1000,                        
                })                
                .mockReturnValueOnce({ 
                    ...defaultAccountInstanceMethods(),            
                    getLogMessage: () => ({
                        'active-card': true,
                        'available-limit': 1000
                    }),                    
                    getAvailableLimit: () => 1000,                        
                })
                .mockReturnValueOnce({         
                    ...defaultAccountInstanceMethods(),            
                    getLogMessage: () => ({
                        'active-card': true,
                        'available-limit': 200
                    }),
                    getAvailableLimit: () => 1000,
                });
            
            Account.getInstance = mockGetInstance;            

            start();

            expect(console.log).toBeCalledTimes(5);                        

            expect(console.log).toHaveBeenNthCalledWith(2, 
                JSON.stringify({
                    account: { "active-card": true, "available-limit": 1000 },
                    violations:[],                    
                }, null)
            );

            expect(console.log).toHaveBeenNthCalledWith(3, 
                JSON.stringify({
                    account: { "active-card": true, "available-limit": 1000 },
                    violations: ['insufficient-limit'],                    
                }, null)
            );

            expect(console.log).toHaveBeenNthCalledWith(4, 
                JSON.stringify({
                    account: { "active-card": true, "available-limit": 1000 },
                    violations: ['insufficient-limit'],                    
                }, null)
            );

            expect(console.log).toHaveBeenNthCalledWith(5, 
                JSON.stringify({
                    account: { "active-card": true, "available-limit": 200 },
                    violations: [],                    
                }, null)
            );
        });

        it('returns "high-frequency-small-interval" when try to do multiple transactions in the last 2 minutes', () => {
            const commands = [
                {account: {"active-card": true, "available-limit": 100}},
                {transaction: {merchant: "Burger King", amount: 20, time: "2019-02-13T11:00:00.000Z"}},
                {transaction: {merchant: "Habbib's", amount: 20, time: "2019-02-13T11:00:01.000Z"}},
                {transaction: {merchant: "McDonald's", amount: 20, time: "2019-02-13T11:01:01.000Z"}},
                {transaction: {merchant: "Subway", amount: 20, time: "2019-02-13T11:01:31.000Z"}},
                {transaction: {merchant: "Burger King", amount: 10, time: "2019-02-13T12:00:00.000Z"}}
            ];

            setupReadlineInterface(commands);            
            
            Account
                .mockImplementationOnce(() => { 
                    return {
                        getLogMessage: () => ({
                            'active-card': true,
                            'available-limit': 100
                        }),
                    }
                });
            
            const mockGetInstance = jest.fn()
                .mockReturnValueOnce()
                .mockReturnValueOnce({      
                    ...defaultAccountInstanceMethods(),            
                    getLogMessage: () => ({
                        'active-card': true,
                        'available-limit': 80
                    }),                    
                    getAvailableLimit: () => 80,
                    getTransactions: () => [],                        
                })                
                .mockReturnValueOnce({ 
                    ...defaultAccountInstanceMethods(),            
                    getLogMessage: () => ({
                        'active-card': true,
                        'available-limit': 60
                    }),                    
                    getAvailableLimit: () => 60,
                    getTransactions: () => [commands[1].transaction],                        
                })
                .mockReturnValueOnce({         
                    ...defaultAccountInstanceMethods(),            
                    getLogMessage: () => ({
                        'active-card': true,
                        'available-limit': 40
                    }),
                    getAvailableLimit: () => 40,
                    getTransactions: () => [commands[1].transaction, commands[2].transaction],                        
                })
                .mockReturnValueOnce({         
                    ...defaultAccountInstanceMethods(),            
                    getLogMessage: () => ({
                        'active-card': true,
                        'available-limit': 40
                    }),
                    getAvailableLimit: () => 40,
                    getTransactions: () => [commands[1].transaction, commands[2].transaction, commands[3].transaction],                        
                })            
                .mockReturnValueOnce({         
                    ...defaultAccountInstanceMethods(),            
                    getLogMessage: () => ({
                        'active-card': true,
                        'available-limit': 30
                    }),
                    getAvailableLimit: () => 30,
                    getTransactions: () => [commands[1].transaction, commands[2].transaction, commands[3].transaction],                        
                });                
            
            Account.getInstance = mockGetInstance;            

            start();

            expect(console.log).toBeCalledTimes(7);                        

            expect(console.log).toHaveBeenNthCalledWith(2, 
                JSON.stringify({
                    account: { "active-card": true, "available-limit": 100 },
                    violations:[],                    
                }, null)
            );

            expect(console.log).toHaveBeenNthCalledWith(3, 
                JSON.stringify({
                    account: { "active-card": true, "available-limit": 80 },
                    violations: [],                    
                }, null)
            );

            expect(console.log).toHaveBeenNthCalledWith(4, 
                JSON.stringify({
                    account: { "active-card": true, "available-limit": 60 },
                    violations: [],                    
                }, null)
            );

            expect(console.log).toHaveBeenNthCalledWith(5, 
                JSON.stringify({
                    account: { "active-card": true, "available-limit": 40 },
                    violations: [],                    
                }, null)
            );

            expect(console.log).toHaveBeenNthCalledWith(6, 
                JSON.stringify({
                    account: { "active-card": true, "available-limit": 40 },
                    violations: ['high-frequency-small-interval'],                    
                }, null)
            );
        });

        it('returns "doubled-transaction" when try to do an repeated transaction in the last 2 minutes', () => {
            const commands = [
                {"account": {"active-card": true, "available-limit": 100}},
                {"transaction": {"merchant": "Burger King", "amount": 20, "time": "2019-02-13T11:00:00.000Z"}},
                {"transaction": {"merchant": "McDonald's", "amount": 10, "time": "2019-02-13T11:00:01.000Z"}},
                {"transaction": {"merchant": "Burger King", "amount": 20, "time": "2019-02-13T11:00:02.000Z"}},
                {"transaction": {"merchant": "Burger King", "amount": 15, "time": "2019-02-13T11:00:03.000Z"}}
            ];

            setupReadlineInterface(commands);            
            
            Account
                .mockImplementationOnce(() => { 
                    return {
                        getLogMessage: () => ({
                            'active-card': true,
                            'available-limit': 100
                        }),
                    }
                });
            
            const mockGetInstance = jest.fn()
                .mockReturnValueOnce()
                .mockReturnValueOnce({      
                    ...defaultAccountInstanceMethods(),            
                    getLogMessage: () => ({
                        'active-card': true,
                        'available-limit': 80
                    }),                    
                    getAvailableLimit: () => 80,
                    getTransactions: () => [],                        
                })                
                .mockReturnValueOnce({ 
                    ...defaultAccountInstanceMethods(),            
                    getLogMessage: () => ({
                        'active-card': true,
                        'available-limit': 70
                    }),                    
                    getAvailableLimit: () => 70,
                    getTransactions: () => [commands[1].transaction],                        
                })
                .mockReturnValueOnce({         
                    ...defaultAccountInstanceMethods(),            
                    getLogMessage: () => ({
                        'active-card': true,
                        'available-limit': 70
                    }),
                    getAvailableLimit: () => 70,
                    getTransactions: () => [commands[1].transaction, commands[2].transaction],                        
                })
                .mockReturnValueOnce({         
                    ...defaultAccountInstanceMethods(),            
                    getLogMessage: () => ({
                        'active-card': true,
                        'available-limit': 55
                    }),
                    getAvailableLimit: () => 55,
                    getTransactions: () => [commands[1].transaction, commands[2].transaction],                        
                })                                          
            
            Account.getInstance = mockGetInstance;            

            start();

            expect(console.log).toBeCalledTimes(6);                        

            expect(console.log).toHaveBeenNthCalledWith(2, 
                JSON.stringify({
                    account: { "active-card": true, "available-limit": 100 },
                    violations:[],                    
                }, null)
            );

            expect(console.log).toHaveBeenNthCalledWith(3, 
                JSON.stringify({
                    account: { "active-card": true, "available-limit": 80 },
                    violations: [],                    
                }, null)
            );

            expect(console.log).toHaveBeenNthCalledWith(4, 
                JSON.stringify({
                    account: { "active-card": true, "available-limit": 70 },
                    violations: [],                    
                }, null)
            );

            expect(console.log).toHaveBeenNthCalledWith(5, 
                JSON.stringify({
                    account: { "active-card": true, "available-limit": 70 },
                    violations: ['doubled-transaction'],                    
                }, null)
            );

            expect(console.log).toHaveBeenNthCalledWith(6, 
                JSON.stringify({
                    account: { "active-card": true, "available-limit": 55 },
                    violations: [],                    
                }, null)
            );
        });

        it('returns multiple violations', () => {
            const commands = [
                {"account": {"active-card": true, "available-limit": 100}},
                {"transaction": {"merchant": "McDonald's", "amount": 10, "time": "2019-02-13T11:00:01.000Z"}},
                {"transaction": {"merchant": "Burger King", "amount": 20, "time": "2019-02-13T11:00:02.000Z"}},
                {"transaction": {"merchant": "Burger King", "amount": 5, "time": "2019-02-13T11:00:07.000Z"}},
                {"transaction": {"merchant": "Burger King", "amount": 5, "time": "2019-02-13T11:00:08.000Z"}},
                {"transaction": {"merchant": "Burger King", "amount": 150, "time": "2019-02-13T11:00:18.000Z"}},
                {"transaction": {"merchant": "Burger King", "amount": 190, "time": "2019-02-13T11:00:22.000Z"}},
                {"transaction": {"merchant": "Burger King", "amount": 15, "time": "2019-02-13T12:00:27.000Z"}}
            ];

            setupReadlineInterface(commands);            
            
            Account
                .mockImplementationOnce(() => { 
                    return {
                        getLogMessage: () => ({
                            'active-card': true,
                            'available-limit': 100
                        }),
                    }
                });
            
            const mockGetInstance = jest.fn()
                .mockReturnValueOnce()
                .mockReturnValueOnce({      
                    ...defaultAccountInstanceMethods(),            
                    getLogMessage: () => ({
                        'active-card': true,
                        'available-limit': 90
                    }),                    
                    getAvailableLimit: () => 90,
                    getTransactions: () => [],                        
                })                
                .mockReturnValueOnce({ 
                    ...defaultAccountInstanceMethods(),            
                    getLogMessage: () => ({
                        'active-card': true,
                        'available-limit': 70
                    }),                    
                    getAvailableLimit: () => 70,
                    getTransactions: () => [commands[1].transaction],                        
                })
                .mockReturnValueOnce({         
                    ...defaultAccountInstanceMethods(),            
                    getLogMessage: () => ({
                        'active-card': true,
                        'available-limit': 65
                    }),
                    getAvailableLimit: () => 65,
                    getTransactions: () => [commands[1].transaction, commands[2].transaction],                        
                })
                .mockReturnValueOnce({         
                    ...defaultAccountInstanceMethods(),            
                    getLogMessage: () => ({
                        'active-card': true,
                        'available-limit': 65
                    }),
                    getAvailableLimit: () => 65,
                    getTransactions: () => [commands[1].transaction, commands[2].transaction, commands[3].transaction],                        
                })                                          
                .mockReturnValueOnce({         
                    ...defaultAccountInstanceMethods(),            
                    getLogMessage: () => ({
                        'active-card': true,
                        'available-limit': 65
                    }),
                    getAvailableLimit: () => 65,
                    getTransactions: () => [commands[1].transaction, commands[2].transaction, commands[3].transaction],                        
                })                                          
                .mockReturnValueOnce({         
                    ...defaultAccountInstanceMethods(),            
                    getLogMessage: () => ({
                        'active-card': true,
                        'available-limit': 65
                    }),
                    getAvailableLimit: () => 65,
                    getTransactions: () => [commands[1].transaction, commands[2].transaction, commands[3].transaction],                        
                })                                          
                .mockReturnValueOnce({         
                    ...defaultAccountInstanceMethods(),            
                    getLogMessage: () => ({
                        'active-card': true,
                        'available-limit': 50
                    }),
                    getAvailableLimit: () => 50,
                    getTransactions: () => [commands[1].transaction, commands[2].transaction, commands[3].transaction],                        
                })                                          
            
            Account.getInstance = mockGetInstance;            

            start();

            expect(console.log).toBeCalledTimes(9);                        

            expect(console.log).toHaveBeenNthCalledWith(2, 
                JSON.stringify({
                    account: { "active-card": true, "available-limit": 100 },
                    violations:[],                    
                }, null)
            );

            expect(console.log).toHaveBeenNthCalledWith(3, 
                JSON.stringify({
                    account: { "active-card": true, "available-limit": 90 },
                    violations: [],                    
                }, null)
            );

            expect(console.log).toHaveBeenNthCalledWith(4, 
                JSON.stringify({
                    account: { "active-card": true, "available-limit": 70 },
                    violations: [],                    
                }, null)
            );

            expect(console.log).toHaveBeenNthCalledWith(5, 
                JSON.stringify({
                    account: { "active-card": true, "available-limit": 65 },
                    violations: [],                    
                }, null)
            );

            expect(console.log).toHaveBeenNthCalledWith(6, 
                JSON.stringify({
                    account: { "active-card": true, "available-limit": 65 },
                    violations: ["high-frequency-small-interval", "doubled-transaction"],                    
                }, null)
            );            
        });
    });
});
