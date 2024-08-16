const message = 'This is a message',
    iv = 'qJ7LYComAKQqBGSAv43+6w==',
    userId = '95907d9c-b4af-4774-b9bd-c0052a84479b',
    partialKey = 'mg8vucu5jdqs8viwp01yEA==';
let constants;

describe('Given we want to decrypt/encrypt messages', () => {
    describe('when decrypting a message', () => {
        test('the correct message should be returned', () => {
            const {encrypt} = require('./SecurityService'),
                {decrypt} = require('./test/SecurityHelper');

            const encryptedMessage = encrypt(message, iv, userId, partialKey);
            const decryptedMessage = decrypt(encryptedMessage, iv, userId, partialKey);

            expect(decryptedMessage).toBe(message);
        });
    });

    describe('when encrypting a message', () => {
        test('the correct hash should be returned', () => {
            const {encrypt} = require('./SecurityService');

            const encryptedMessage = encrypt(message, iv, userId, partialKey);

            expect('QinAFbaLRRe5rwU2lLVTnvDkqnjUXLqr7CLc1BauQ/M=').toBe(encryptedMessage);
        });
    });
});

describe('given we want to generate a challenge string', () => {
    beforeEach(() => {
        jest.mock('crypto', () => {
            return {
                randomBytes: jest.fn(() => {
                    return {
                        toString: jest.fn()
                    };
                })
            };
        });
    });

    afterEach(() => {
        jest.unmock('crypto');
        jest.unmock('./constants');
    });

    describe("when we don't have the feature flag enabled for load testing", () => {
        beforeEach(() => {
            jest.mock('./constants', () => {
                return {
                    ENABLE_STATIC_FM_AUTH_CHALLENGE: false,
                    STATIC_FM_AUTH_CHALLENGE_STRING: 'abcdefgh'
                };
            });
            constants = require('./constants');
        });
        test('then we generate a random string', () => {
            const {getChallenge} = require('./SecurityService');
            expect(getChallenge()).not.toEqual(constants.STATIC_FM_AUTH_CHALLENGE_STRING);
        });
    });

    describe('when we have the feature flag enabled for load testing', () => {
        beforeEach(() => {
            jest.mock('./constants', () => {
                return {
                    ENABLE_STATIC_FM_AUTH_CHALLENGE: true,
                    STATIC_FM_AUTH_CHALLENGE_STRING: 'abcdefgh'
                };
            });
            constants = require('./constants');
        });
        test('then we return the predetermined string', () => {
            const {getChallenge} = require('./SecurityService');
            expect(getChallenge()).toEqual(constants.STATIC_FM_AUTH_CHALLENGE_STRING);
        });
    });
});
