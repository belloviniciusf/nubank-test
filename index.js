var readline = require('readline');
const AccountAlreadyInitialized = require('./helpers/AccountAlreadyInitialized');
const Account = require('./models/Account');

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', function (cmd) {
    const jsonData = JSON.parse(cmd);
    const violations = [];

    if (jsonData.transaction) {
        const currentAccount = Account.getInstance();
        const transaction = jsonData.transaction;        

        if (!currentAccount) {
            const logResponse = {
                ...jsonData,
                violations
            }

            violations.push("account-not-initialized");

            console.log('\n', JSON.stringify(logResponse, null));
            return;
        }

        currentAccount.addTransaction(transaction);            

        const logMessage = currentAccount.getLogMessage();

        console.log('\r', JSON.stringify(logMessage, null), '\n -----');                    
    }        
    else {               
        const account = jsonData.account;        
        let currentAccount;
        
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
});
