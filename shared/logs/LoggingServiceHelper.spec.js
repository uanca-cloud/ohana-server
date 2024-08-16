let sk;
beforeEach(() => {
    sk = require('./LoggingServiceHelper');
});

beforeEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
});

describe('When working with the Logging_Service_Helper', () => {
    describe('When working with a recursive function like isKeywordPresent : o(n)', () => {
        describe('GIVEN a valid object with a NON VALID keyword to search', () => {
            it('should return null when no match is found', () => {
                const target = {testFn: jest.fn(), foo: 'bar', baz: 'qux', nested: {quux: 'quuz'}};
                const keywordSet = new Set(['corge', 'grault', 'garply']);
                expect(sk.isKeywordPresent(target, keywordSet)).toBe(false);
            });
        });

        describe('GIVEN a valid object with a VALID keyword to search', () => {
            it('should return the keyword when a match is found', () => {
                const target = {foo: 'bar', baz: 'qux', nested: {quux: 'quuz', testFn: jest.fn()}};
                const keywordSet = new Set(['foo', 'grault', 'garply']);
                expect(sk.isKeywordPresent(target, keywordSet)).toBe(true);
            });
        });

        describe('GIVEN a valid object with a VALID keyword in a level 1 nested object to search', () => {
            it('should return the keyword when a match is found in a nested object 1 level', () => {
                const target = {foo: 'bar', baz: 'qux', nested: {quux: 'quuz', testFn: jest.fn()}};
                const keywordSet = new Set(['corge', 'quux', 'garply']);
                expect(sk.isKeywordPresent(target, keywordSet)).toBe(true);
            });
        });

        describe('GIVEN a valid object with a VALID keyword in a level 2 nested object to search', () => {
            it('should return the keyword when a match is found in a nested object 2 levels', () => {
                const target = {
                    foo: 'bar',
                    baz: 'qux',
                    nested: {foo: 'bar', baz: 'qux', testFn: jest.fn(), nested: {quux: 'quuz'}}
                };
                const keywordSet = new Set(['corge', 'quux', 'garply']);
                expect(sk.isKeywordPresent(target, keywordSet)).toBe(true);
            });
        });

        describe('GIVEN a null object to search', () => {
            it('should return null', () => {
                const target = {};
                const keywordSet = new Set(['corge', 'quux', 'garply']);
                expect(sk.isKeywordPresent(target, keywordSet)).toBe(false);
            });
        });

        describe('GIVEN an empty object to search', () => {
            it('should return null', () => {
                const target = {};
                const keywordSet = new Set(['corge', 'quux', 'garply']);
                expect(sk.isKeywordPresent(target, keywordSet)).toBe(false);
            });
        });

        describe('GIVEN a valid object with a VALID keyword and a Function as Value in a level 2 nested object to search', () => {
            it('should return the keyword when a match is found in a nested object 2 levels', () => {
                const target = {
                    foo: 'bar',
                    baz: 'qux',
                    nested: {foo: 'bar', baz: 'qux', testFn: jest.fn(), nested: {quux: 'quuz'}}
                };
                const keywordSet = new Set(['corge', 'testFn', 'garply']);
                expect(sk.isKeywordPresent(target, keywordSet)).toBe(true);
            });
        });
    });
});
