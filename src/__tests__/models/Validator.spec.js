const { describe, it, expect } = require('@jest/globals');
const { MOCK_TRANSACTION_DATA } = require('..');
const OPERATIONS_TYPE = require('../../enums/operationsType');
const Validator = require('../../models/Validator');

describe('Validator', () => {
    describe('constructor', () => {
        it('creates successfully a validator', () => {
            const validator = new Validator({});        
    
            expect(validator).toBeInstanceOf(Validator);
            expect(validator.rules).toStrictEqual({});
        });        
    });

    describe('validate', () => {    
        it('returns no violations', () => {
            const doingTheTestRule = {                        
                hasSomeViolation: () => false,
                violation: 'doing-the-test'                        
            }

            const rules = {
                [OPERATIONS_TYPE.ACCOUNT]: [doingTheTestRule]
            };

            const validator = new Validator(rules);

            const violations = validator.validate(this, OPERATIONS_TYPE.ACCOUNT, {});

            expect(violations).toStrictEqual([]);
        });

        it('returns violations identifier', () => {
            const doingTheTestRule = {                        
                hasSomeViolation: () => true,
                violation: 'doing-the-test'                        
            };

            const anotherStuffRule = {
                hasSomeViolation: () => true,
                violation: 'another-stuff'                                    
            };

            const rules = {
                [OPERATIONS_TYPE.ACCOUNT]: [doingTheTestRule, anotherStuffRule]
            };

            const validator = new Validator(rules);

            const violations = validator.validate(this, OPERATIONS_TYPE.ACCOUNT, {});

            expect(violations).toStrictEqual(['doing-the-test', 'another-stuff']);
        });

        it('returns only the break validation identifier', () => {
            const doingTheTestRule = {                        
                hasSomeViolation: () => true,
                violation: 'doing-the-test',
                break: true,                        
            };

            const anotherStuffRule = {
                hasSomeViolation: () => true,
                violation: 'another-stuff'
            }

            const rules = {
                [OPERATIONS_TYPE.ACCOUNT]: [doingTheTestRule, anotherStuffRule]
            };

            const validator = new Validator(rules);

            const violations = validator.validate(this, OPERATIONS_TYPE.ACCOUNT, {});

            expect(violations).toStrictEqual(['doing-the-test']);
        });
    });
});