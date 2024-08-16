const mockOhanaShared = (mockExternalIdTypes) => {
    jest.mock('./constants', () => ({
        EXTERNAL_ID_TYPES: mockExternalIdTypes,
        TENANT_SETTINGS_KEYS: {EXTERNAL_ID_TYPE: 'externalIdType'}
    }));
};

beforeEach(() => {
    jest.mock('./tenant/TenantSettingsDao', () => ({
        getTenantSetting: () =>
            Promise.resolve({
                key: 'externalIdType',
                value: 'MR'
            })
    }));
});

afterEach(() => {
    jest.unmock('./tenant/TenantSettingsDao');
});

describe('When trying to format the id for the cdr hash', () => {
    test('then it should return the formatted string', () => {
        const {formatCDRHashId} = require('./CDRHelper');
        expect(formatCDRHashId('123', 'MRN123', 'MR')).toBe('123_MRN123_MR');
    });
});

describe('When trying to convert the external id type name into the external id type code', () => {
    describe('and an external id type code exists for that name', () => {
        test('then it should return the correct external id type code', () => {
            const externalIdTypes = [
                {key: 'MR', value: 'Medical Record Number (MRN)'},
                {key: 'VN', value: 'Visit Number'},
                {key: 'PI', value: 'Patient Identifier'},
                {key: 'AN', value: 'Account Number'}
            ];
            mockOhanaShared(externalIdTypes);

            const {convertExternalIdTypeNameToId} = require('./CDRHelper');
            expect(convertExternalIdTypeNameToId('Medical Record Number')).toBe('MR');
        });
    });

    describe('and an external id type code does not exist for that name', () => {
        test('then it should return undefined', () => {
            const externalIdTypes = [
                {key: 'MR', value: 'Medical Record Number (MRN)'},
                {key: 'VN', value: 'Visit Number'},
                {key: 'PI', value: 'Patient Identifier'},
                {key: 'AN', value: 'Account Number'}
            ];
            mockOhanaShared(externalIdTypes);

            const {convertExternalIdTypeNameToId} = require('./CDRHelper');
            expect(convertExternalIdTypeNameToId('ABCD')).toBe(undefined);
        });
    });

    describe('and the external id type list is empty', () => {
        test('then it should return undefined', () => {
            mockOhanaShared([]);
            const {convertExternalIdTypeNameToId} = require('./CDRHelper');
            expect(convertExternalIdTypeNameToId('Medical Record Number')).toBe(undefined);
        });
    });
});

describe('When trying to validate the external id type name against the tenant setting', () => {
    describe('and the types match', () => {
        test('then it should return true', async () => {
            const externalIdTypes = [
                {key: 'MR', value: 'Medical Record Number (MRN)'},
                {key: 'VN', value: 'Visit Number'},
                {key: 'PI', value: 'Patient Identifier'},
                {key: 'AN', value: 'Account Number'}
            ];
            mockOhanaShared(externalIdTypes);
            const {checkExternalIdTypeOnTenant} = require('./CDRHelper');
            expect(await checkExternalIdTypeOnTenant('Medical Record Number', '1234')).toBe(true);
        });
    });

    describe('and the types do not match', () => {
        test('then it should return false', async () => {
            const externalIdTypes = [
                {key: 'MR', value: 'Medical Record Number (MRN)'},
                {key: 'VN', value: 'Visit Number'},
                {key: 'PI', value: 'Patient Identifier'},
                {key: 'AN', value: 'Account Number'}
            ];
            mockOhanaShared(externalIdTypes);
            const {checkExternalIdTypeOnTenant} = require('./CDRHelper');
            expect(await checkExternalIdTypeOnTenant('Visit Number', '1234')).toBe(false);
        });
    });
});
