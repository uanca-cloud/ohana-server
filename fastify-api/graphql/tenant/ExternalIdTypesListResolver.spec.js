const mockOhanaShared = (mockExternalIdTypes) => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        CONSTANTS: {
            EXTERNAL_ID_TYPES: mockExternalIdTypes
        }
    }));
};

describe('Given we want to resolve a GQL query to list the external id types', () => {
    describe('When the external id types list is empty', () => {
        test('then it should return an empty array', async () => {
            mockOhanaShared([]);
            const resolver = require('./ExternalIdTypesListResolver');
            const result = await resolver();

            expect(result).toStrictEqual([]);
        });
    });

    describe('When external id types list is not empty', () => {
        test('then it should return the array', async () => {
            const externalIdTypes = [
                {key: 'MR', value: 'Medical Record Number (MRN)'},
                {key: 'VN', value: 'Visit Number'},
                {key: 'PI', value: 'Patient Identifier'},
                {key: 'AN', value: 'Account Number'}
            ];
            mockOhanaShared(externalIdTypes);
            const resolver = require('./ExternalIdTypesListResolver');
            const result = await resolver();

            expect(result).toStrictEqual(externalIdTypes);
        });
    });
});
