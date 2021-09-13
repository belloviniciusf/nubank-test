class Validator {
    constructor(rules) {                
        this.rules = rules;
    };            

    validate(instance, currentData) {
        return this.rules.filter((rule) => {
            return rule.hasSomeViolation(instance, currentData);            
        }).map((rule) => rule.violation);
    }
}

module.exports = Validator;