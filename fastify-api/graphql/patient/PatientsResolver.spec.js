let resolver = null;

beforeEach(() => {
    resolver = require('./PatientsResolver');

    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        getPatientsByUser: jest.fn(() => [
            {
                id: '29',
                externalId: '22224444',
                externalIdType: 'mrn',
                firstName: 'roxana',
                lastName: 'rox',
                dateOfBirth: '03/15/1991',
                lastUpdatedAt: '2021-04-23T08:27:46Z',
                location: {
                    id: '2',
                    label: 'RMN'
                }
            }
        ])
    }));
});

afterEach(() => {
    jest.unmock('./PatientsResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL query to get the patients of a user', () => {
    describe('when input is provided', () => {
        test('then it should return true', async () => {
            const result = await resolver(null, {userId: 1, tenantId: 1}, {userId: 1, tenantId: 1});

            expect(result).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        id: '29',
                        externalId: '22224444',
                        externalIdType: 'mrn',
                        firstName: 'roxana',
                        lastName: 'rox',
                        dateOfBirth: '03/15/1991',
                        lastUpdatedAt: '2021-04-23T08:27:46Z',
                        location: {
                            id: '2',
                            label: 'RMN'
                        }
                    })
                ])
            );
        });
    });
});
