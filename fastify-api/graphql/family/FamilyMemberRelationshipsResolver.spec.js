const mockOhanaShared = (mockFamilyRelations) => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        CONSTANTS: {
            FAMILY_RELATIONS: mockFamilyRelations,
            FAMILY_RELATION_WITH_PATIENT: 'Self/Patient'
        }
    }));
};

describe('Given we want to resolve a GQL query to list the family member relationships', () => {
    describe('When family relations list is empty', () => {
        test('then it should return at least the patient', async () => {
            mockOhanaShared([]);
            const resolver = require('./FamilyMemberRelationshipsResolver');
            const result = await resolver({}, {}, {version: '1.8.0'});

            expect(result).toStrictEqual(['Self/Patient']);
        });
    });

    describe('When family relations list is not empty', () => {
        test('then it should return the array with Self/Patient relation', async () => {
            mockOhanaShared(['Parent', 'Sibling', 'Spouse', 'Child', 'Friend', 'Other']);
            const resolver = require('./FamilyMemberRelationshipsResolver');
            const result = await resolver({}, {}, {version: '1.9.1'});

            expect(result).toStrictEqual([
                'Self/Patient',
                'Parent',
                'Sibling',
                'Spouse',
                'Child',
                'Friend',
                'Other'
            ]);
        });
    });
});
