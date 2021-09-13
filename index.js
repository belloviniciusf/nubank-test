var readline = require('readline');
const AccountAlreadyInitialized = require('./helpers/AccountAlreadyInitialized');
const Account = require('./models/Account');

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let currentAccount;

rl.on('line', function (cmd) {
    const jsonData = JSON.parse(cmd);
    const violations = [];

    if (jsonData.transaction) {
        const transaction = jsonData.transaction;

        if (!(currentAccount instanceof Account)) {
            const logResponse = {
                ...jsonData,
                violations
            }

            violations.push("account-not-initialized");

            console.log('\n', JSON.stringify(logResponse, null));
            return;
        }

        try {
            currentAccount.addTransaction(transaction);            
        } catch (err) {
            violations.push(err.violation);
        } finally {
            const logResponse = {
                transaction: {
                    ...transaction,
                    'available-limit': currentAccount.getAvailableLimit(),                    
                },                                
                violations
            };
    
            console.log('\r', JSON.stringify(logResponse, null), '\n -----');            
        }                            
    }        
    else {               
        const account = jsonData.account;        

        try {
            currentAccount = new Account(account['active-card'], account['available-limit']);        
        } catch (err) {
            if (err instanceof AccountAlreadyInitialized) {                
                violations.push(err.violation);
            }
        } finally {
            const logResponse = {
                account: {
                    ...account,
                    'active-card': currentAccount.getIsCardActive(),
                },                
                violations
            }

            console.log('\r', JSON.stringify(logResponse, null), '\n -----');            
        }                    
    }        
    // console.log('You just typed: '+ JSON.stringify(jsonData, null, 2));
});
