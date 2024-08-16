let ohanaSharedPackage = null,
    resolver = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        getInactiveEncounters: jest.fn(() => [
            {
                updatedAt: 75,
                tenantId: 1,
                encounterId: 1,
                patientId: 1,
                firstName: 'john',
                lastName: 'doe',
                dateOfBirth: '1991-03-15',
                autoUnenrollPeriod: 72
            }
        ]),
        CONSTANTS: {
            PUSH_NOTIFICATIONS_TYPES: {UNENROLL: 'UNENROLL'},
            PUSH_NOTIFICATION_TEMPLATE_FM_UNENROLL: 'Please contact the caregiver to reregister.',
            PUSH_NOTIFICATION_TEMPLATE_PATIENT_UNENROLL: 'Your <%= appName %> session has ended.',
            FAMILY_APP_NAME: 'Voalte Family'
        },
        endEncounters: jest.fn(),
        getPatientsWithClosedEncounters: jest.fn(),
        unEnrollPatients: jest.fn(),
        deletePatientsChatChannel: jest.fn(),
        bootstrapAzf: jest.fn(() => {}),
        runWithTransaction: (cb) => cb({})
    }));

    ohanaSharedPackage = require('ohana-shared');
    resolver = require('./AutoUnenrollPatientScheduledFunction');
});

afterEach(() => {
    jest.unmock('ohana-shared');
    jest.unmock('date-fns');
});

describe('Given we want to remove and unenroll a Patient', () => {
    describe('Given there is a Patient to unenroll', () => {
        const myTimer = {
            scheduleStatus: {
                lastUpdated: '01-01-2023'
            }
        };

        test('then the bootstrapAzf function should be called to bootstrap the server', async () => {
            await resolver(null, myTimer);

            expect(ohanaSharedPackage.bootstrapAzf).toBeCalledTimes(1);
        });

        test('then the getInactiveEncounters function should be called to get all active encounters', async () => {
            await resolver(null, myTimer);

            expect(ohanaSharedPackage.getInactiveEncounters).toBeCalledTimes(1);
        });

        describe('when there are inactive encounters', () => {
            test('then we should end them', async () => {
                await resolver(null, myTimer);

                expect(ohanaSharedPackage.endEncounters).toBeCalledTimes(1);
            });

            test('then we should unenroll patients if they have closed encounters', async () => {
                ohanaSharedPackage.getPatientsWithClosedEncounters.mockResolvedValueOnce([
                    {
                        encounterId: 1,
                        patientId: 1,
                        tenantId: '0000',
                        userId: 1
                    }
                ]);
                await resolver(null, myTimer);

                expect(ohanaSharedPackage.unEnrollPatients).toBeCalledTimes(1);
                expect(ohanaSharedPackage.deletePatientsChatChannel).toBeCalledTimes(1);
            });

            test("then we should not unenroll patients if they don't exist", async () => {
                ohanaSharedPackage.getPatientsWithClosedEncounters.mockResolvedValueOnce(null);
                await resolver(null, myTimer);

                expect(ohanaSharedPackage.unEnrollPatients).toBeCalledTimes(0);
                expect(ohanaSharedPackage.deletePatientsChatChannel).toBeCalledTimes(0);
            });
        });

        describe('when there are no inactive encounters', () => {
            test('then we should not end them', async () => {
                ohanaSharedPackage.getInactiveEncounters.mockResolvedValueOnce(null);
                await resolver(null, myTimer);

                expect(ohanaSharedPackage.endEncounters).toBeCalledTimes(0);
                expect(ohanaSharedPackage.deletePatientsChatChannel).toBeCalledTimes(0);
            });
        });
    });
});
