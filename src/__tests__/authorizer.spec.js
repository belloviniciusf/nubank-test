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
        getAllowedList: () => false,
        setAllowedList: () => {},
        addTransaction: () => {},        
    }
};

const formatAccountResponse = (activeCard, availableLimit, violations, allowedList = false) => 
    JSON.stringify({
        account: {
            'allowed-list': allowedList,
            'active-card': activeCard,
            'available-limit': availableLimit
        },
        violations
    }, null);

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

            Account.getInstance = jest.fn().mockReturnValue({
                ...defaultAccountInstanceMethods(),
                getLogMessage,
                addTransaction
            });

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

            expect(console.log).toHaveBeenLastCalledWith(formatAccountResponse(true, 175, []));
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
                });

            const mockGetInstance = jest.fn()
                .mockReturnValueOnce()
                .mockReturnValueOnce({ 
                    getLogMessage: () => MOCK_ACCOUNT_DATA.account 
                });
            
            Account.getInstance = mockGetInstance;                        

            start();                     

            expect(console.log).toBeCalledTimes(3);                        
                        
            expect(console.log).toHaveBeenNthCalledWith(2, 
                formatAccountResponse(true, 175, [])
            );                    

            expect(console.log).toHaveBeenNthCalledWith(3, 
                formatAccountResponse(true, 175, ['account-already-initialized'])
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

            expect(console.log).toHaveBeenNthCalledWith(2, 
                formatAccountResponse(false, 100, [])                                                
            );

            expect(console.log).toHaveBeenNthCalledWith(3, 
                formatAccountResponse(false, 100, ['card-not-active'])                
            );

            expect(console.log).toHaveBeenNthCalledWith(4, 
                formatAccountResponse(false, 100, ['card-not-active'])
            );            
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
                formatAccountResponse(true, 1000, [])
            );

            expect(console.log).toHaveBeenNthCalledWith(3, 
                formatAccountResponse(true, 1000, ['insufficient-limit'])
            );

            expect(console.log).toHaveBeenNthCalledWith(4, 
                formatAccountResponse(true, 1000, ['insufficient-limit'])
            );

            expect(console.log).toHaveBeenNthCalledWith(5, 
                formatAccountResponse(true, 200, [])
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
                formatAccountResponse(true, 100, [])
            );

            expect(console.log).toHaveBeenNthCalledWith(3, 
                formatAccountResponse(true, 80, [])
            );

            expect(console.log).toHaveBeenNthCalledWith(4, 
                formatAccountResponse(true, 60, [])
            );

            expect(console.log).toHaveBeenNthCalledWith(5, 
                formatAccountResponse(true, 40, [])                 
            );

            expect(console.log).toHaveBeenNthCalledWith(6, 
                formatAccountResponse(true, 40, ['high-frequency-small-interval'])
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
                formatAccountResponse(true, 100, [])                                
            );

            expect(console.log).toHaveBeenNthCalledWith(3, 
                formatAccountResponse(true, 80, [])                                
            );

            expect(console.log).toHaveBeenNthCalledWith(4, 
                formatAccountResponse(true, 70, [])
            );

            expect(console.log).toHaveBeenNthCalledWith(5, 
                formatAccountResponse(true, 70, ['doubled-transaction'])
            );

            expect(console.log).toHaveBeenNthCalledWith(6, 
                formatAccountResponse(true, 55, [])
            );
        });

        it('runs an allow list operation', () => {
            const commands = [
                { "account": { "active-card": true, "available-limit": 1000 } },
                { "allow-list": { "active": true } },
                { "transaction": { "merchant": "A", "amount": 20, "time": "2019-02-13T10:00:00.000Z" } },
                { "transaction": { "merchant": "B", "amount": 30, "time": "2019-02-13T10:00:01.000Z" } },
                { "transaction": { "merchant": "C", "amount": 40, "time": "2019-02-13T10:00:02.000Z" } },
                { "transaction": { "merchant": "D", "amount": 50, "time": "2019-02-13T10:00:03.000Z" } },
                { "transaction": { "merchant": "E", "amount": 2000, "time": "2019-02-13T10:00:04.000Z" } },
                { "allow-list": { "active": false } },
                { "transaction": { "merchant": "F", "amount": 50, "time": "2019-02-13T10:00:04.000Z" } },
            ];

            setupReadlineInterface(commands);

            Account
            .mockImplementationOnce(() => { 
                return {
                    getLogMessage: () => ({
                        'allowed-list': false,
                        'active-card': true,
                        'available-limit': 1000
                    }),
                }
            });

            const mockGetInstance = jest.fn()
                .mockReturnValueOnce()
                .mockReturnValueOnce({      
                    ...defaultAccountInstanceMethods(),            
                    getAllowedList: () => true,             
                    getLogMessage: () => ({
                        'allowed-list': true,
                        'active-card': true,
                        'available-limit': 1000
                    }),                    
                    getAvailableLimit: () => 1000,
                    getTransactions: () => [],                        
                })
                .mockReturnValueOnce({      
                    ...defaultAccountInstanceMethods(),            
                    getLogMessage: () => ({
                        'allowed-list': true,
                        'active-card': true,
                        'available-limit': 980
                    }),       
                    getAllowedList: () => true,             
                    getAvailableLimit: () => 980,
                    getTransactions: () => [],                        
                })
                .mockReturnValueOnce({      
                    ...defaultAccountInstanceMethods(),            
                    getAllowedList: () => true,
                    getLogMessage: () => ({
                        'allowed-list': true,
                        'active-card': true,
                        'available-limit': 950
                    }),                    
                    getAvailableLimit: () => 950,
                    getTransactions: () => [],                        
                })
                .mockReturnValueOnce({      
                    ...defaultAccountInstanceMethods(),            
                    getAllowedList: () => true,
                    getLogMessage: () => ({
                        'allowed-list': true,
                        'active-card': true,
                        'available-limit': 910
                    }),                    
                    getAvailableLimit: () => 910,
                    getTransactions: () => [commands[2].transaction],                        
                })
                .mockReturnValueOnce({      
                    ...defaultAccountInstanceMethods(),            
                    getAllowedList: () => true,
                    getLogMessage: () => ({
                        'allowed-list': true,
                        'active-card': true,
                        'available-limit': 860
                    }),                    
                    getAvailableLimit: () => 860,
                    getTransactions: () => [commands[2].transaction, commands[3].transaction],                        
                })
                .mockReturnValueOnce({      
                    ...defaultAccountInstanceMethods(),            
                    getAllowedList: () => true,
                    getLogMessage: () => ({
                        'allowed-list': true,
                        'active-card': true,
                        'available-limit': 860
                    }),                    
                    getAvailableLimit: () => 860,
                    getTransactions: () => [commands[2].transaction, commands[3].transaction, commands[4].transaction],                        
                })                
                .mockReturnValueOnce({      
                    ...defaultAccountInstanceMethods(),            
                    getLogMessage: () => ({
                        'allowed-list': false,
                        'active-card': true,
                        'available-limit': 860
                    }),                    
                    getAvailableLimit: () => 860,
                    getTransactions: () => [commands[2].transaction, commands[3].transaction, commands[4].transaction],                        
                })
                .mockReturnValueOnce({      
                    ...defaultAccountInstanceMethods(),            
                    getLogMessage: () => ({
                        'allowed-list': false,
                        'active-card': true,
                        'available-limit': 860
                    }),                    
                    getAvailableLimit: () => 860,
                    getTransactions: () => [commands[2].transaction, commands[3].transaction, commands[4].transaction],                        
                })

            Account.getInstance = mockGetInstance;            

            start();

            expect(console.log).toBeCalledTimes(10);                        

            expect(console.log).toHaveBeenNthCalledWith(2, 
                formatAccountResponse(true, 1000, [], false)                                
            );

            expect(console.log).toHaveBeenNthCalledWith(3, 
                formatAccountResponse(true, 1000, [], true)                                
            );

            expect(console.log).toHaveBeenNthCalledWith(4, 
                formatAccountResponse(true, 980, [], true)                                
            );

            expect(console.log).toHaveBeenNthCalledWith(5, 
                formatAccountResponse(true, 950, [], true)                                
            );

            expect(console.log).toHaveBeenNthCalledWith(6, 
                formatAccountResponse(true, 910, [], true)                                
            );

            expect(console.log).toHaveBeenNthCalledWith(7, 
                formatAccountResponse(true, 860, [], true)                                
            );

            expect(console.log).toHaveBeenNthCalledWith(8, 
                formatAccountResponse(true, 860, ['insufficient-limit'], true)                                
            );

            expect(console.log).toHaveBeenNthCalledWith(9, 
                formatAccountResponse(true, 860, [], false)                                
            );

            expect(console.log).toHaveBeenNthCalledWith(10, 
                formatAccountResponse(true, 860, ['high-frequency-small-interval'], false)                                
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
                formatAccountResponse(true, 100, [])                
            );

            expect(console.log).toHaveBeenNthCalledWith(3,                 
                formatAccountResponse(true, 90, [])                
            );

            expect(console.log).toHaveBeenNthCalledWith(4, 
                formatAccountResponse(true, 70, [])
            );

            expect(console.log).toHaveBeenNthCalledWith(5, 
                formatAccountResponse(true, 65, [])
            );

            expect(console.log).toHaveBeenNthCalledWith(6, 
                formatAccountResponse(true, 65, ["high-frequency-small-interval", "doubled-transaction"])                
            );            
        });
    });
});
