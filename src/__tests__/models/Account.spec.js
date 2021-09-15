const { describe, it, expect } = require('@jest/globals');
const { MOCK_TRANSACTION_DATA } = require('..');
const Account = require('../../models/Account');

describe('Account', () => {
    describe('constructor', () => {
        it('creates successfully a account', () => {
            const account = new Account(true, 400);        
    
            expect(account).toBeInstanceOf(Account);
            expect(account.getIsCardActive()).toBe(true);
            expect(account.getAvailableLimit()).toBe(400);
        });        
    });

    describe('getInstance', () => {
        it('returns currently instance', () => {
            const account = new Account(true, 400);                    

            const instanceRecovered = Account.getInstance();

            expect(account).toEqual(instanceRecovered);
        });
    });

    describe('addTransaction', () => {
        it('adds transaction and updates available limit', () => {
            const account = new Account(true, 400);       
            
            expect(account.getAvailableLimit()).toBe(400);

            const transaction = MOCK_TRANSACTION_DATA.transaction

            account.addTransaction(transaction);
            
            expect(account.getAvailableLimit()).toBe(400 - transaction.amount);
            expect(account.getTransactions().length).toBe(1);
        })
    });

    describe('getLogMessage', () => {
        it('returns formatted log message', () => {
            const account = new Account(true, 400);

            const logMessage = account.getLogMessage();

            expect(logMessage).toStrictEqual({ 'active-card': true, 'available-limit': 400 });
        })
    });
});