class Validator {
    constructor(rules) {                
        this.rules = rules;
    };                

    validate(instance, type, currentData) {        
        const typeRules = this.rules[type];        

        const violatedRules = typeRules?.reduce((acc, rule, _, arr) => {
            const hasViolation = rule.hasSomeViolation(instance, currentData);

            if (hasViolation) acc = [ ...acc, rule];
            if (hasViolation && rule.break) arr.splice(1);

            return acc;
        }, []);

        return violatedRules?.map((rule) => rule.violation) || [];            
    }
}

module.exports = Validator;