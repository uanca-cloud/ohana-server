const {gte, ltLastSupportedVersion} = require('./VersionCheckHelper'),
    {OHANA_VERSION_1_1_0} = require('./constants');

describe('Given we want to check if a version is greater than 1.1.0', () => {
    describe('when the version is greater than 1.1.0', () => {
        test('then it should return true', () => {
            expect(gte('1.1.1', OHANA_VERSION_1_1_0)).toBe(true);
        });
    });

    describe('when the version is smaller than 1.1.0', () => {
        test('then it should return false', () => {
            expect(gte('1.0.0', OHANA_VERSION_1_1_0)).toBe(false);
        });
    });
});

describe('Given we want to check if a version is supported', () => {
    describe('when the version is greater than the latest supported version', () => {
        test('then it should return true', () => {
            expect(ltLastSupportedVersion('0.0.1')).toBe(true);
        });
    });

    describe('when the version is smaller than the latest supported version', () => {
        test('then it should return false', () => {
            expect(ltLastSupportedVersion('9.9.99')).toBe(false);
        });
    });

    describe('when the version is missing', () => {
       test('then it should return true', () => {
           expect(ltLastSupportedVersion()).toBe(true);
       });
    });
});
