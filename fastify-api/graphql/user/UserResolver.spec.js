let resolver = null;

beforeEach(() => {
    resolver = require('./UserResolver');

    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        getUserByUserId: jest.fn(() => {
            return {
                id: 1,
                tenant: {
                    id: 1
                },
                firstName: 'John',
                lastName: 'Doe',
                role: 'ApprovedUser'
            };
        })
    }));
});

afterEach(() => {
    jest.unmock('./UserResolver');
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL query to get user details', () => {
    describe('when input is provided', () => {
        test('then it should return the user', async () => {
            const result = await resolver(null, {}, {userId: 1});

            expect(result).toEqual(
                expect.objectContaining({
                    id: 1,
                    tenant: {
                        id: 1
                    },
                    firstName: 'John',
                    lastName: 'Doe',
                    role: 'ApprovedUser'
                })
            );
        });
    });
});
