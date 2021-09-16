#!/usr/bin/env node
class Task {
    constructor() {
        this.operations = [];
    }
    
    addOperation(operation) {
        this.operations.push(operation);
    }

    getOperations() {
        return this.operations;
    }
}

module.exports = Task;