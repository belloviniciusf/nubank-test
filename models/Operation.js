class Operation {
    constructor() {          
        if (Operation._instance) {
            return this;;            
        }            

        Operation._instance = this;
        
        this.operations = [];
    }
    
    addOperation(operation) {
        this.operations.push(operation);
    }

    getOperations() {
        return this.operations;
    }
}

module.exports = Operation;