class Validator {
    constructor(rules) {                
        this.rules = rules;
    };                

    validate(instance, type, currentData) {
        const typeRules = this.rules[type];        

        const violatedRules = typeRules.filter((rule) => {
            return rule.hasSomeViolation(instance, currentData);            
        });

        return violatedRules.some((rule) => rule.break) ? 
            violatedRules.filter((rule) => rule.break).map((rule) => rule.violation):
            violatedRules.map((rule) => rule.violation)
    }
}

module.exports = Validator;