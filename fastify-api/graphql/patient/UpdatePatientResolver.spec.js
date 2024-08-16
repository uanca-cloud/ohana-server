let resolver = null,
    ohanaSharedPackage = null;

beforeEach(() => {
    jest.mock('ohana-shared', () => ({
        ...jest.requireActual('ohana-shared'),
        updatePatientData: jest.fn(() => {
            return {
                id: '1',
                externalId: '33333',
                externalIdType: 'MRN',
                firstName: 'john',
                lastName: 'dow',
                dateOfBirth: '1991-03-15',
                location: {
                    id: '1',
                    label: 'ICU'
                }
            };
        }),
        createAuditEvent: jest.fn(() => true)
    }));

    resolver = require('./UpdatePatientResolver');
    ohanaSharedPackage = require('ohana-shared');
});

afterEach(() => {
    jest.unmock('ohana-shared');
});

describe('Given we want to resolve a GQL mutation update patient info', () => {
    describe('when input is provided', () => {
        test('then it should return the patient information', async () => {
            const result = await resolver(
                null,
                {
                    patient: {
                        patientId: 1,
                        externalId: '33333',
                        externalIdType: 'mrn',
                        firstName: 'john',
                        lastName: 'doe',
                        dateOfBirth: '1991-03-15',
                        locationId: 1,
                        allowSecondaryFamilyMembers: true
                    }
                },
                {tenantId: 1}
            );

            expect(result).toEqual(
                expect.objectContaining({
                    id: '1',
                    externalId: '33333',
                    externalIdType: 'MRN',
                    firstName: 'john',
                    lastName: 'dow',
                    dateOfBirth: '1991-03-15',
                    location: {
                        id: '1',
                        label: 'ICU'
                    }
                })
            );
        });

        test('then it should create the audit event', async () => {
            await resolver(
                null,
                {
                    patient: {
                        patientId: 1,
                        externalId: '33333',
                        externalIdType: 'mrn',
                        firstName: 'john',
                        lastName: 'doe',
                        dateOfBirth: '1991-03-15',
                        locationId: 1,
                        allowSecondaryFamilyMembers: true
                    }
                },
                {tenantId: 1}
            );

            expect(ohanaSharedPackage.createAuditEvent).toHaveBeenCalled();
        });
    });

    describe('and a patient cannot be updated', () => {
        test('then it should return null and not call create audit event', async () => {
            ohanaSharedPackage.updatePatientData.mockImplementationOnce(() => null);

            const result = await resolver(
                null,
                {
                    patient: {
                        patientId: 1,
                        externalId: '33333',
                        externalIdType: 'mrn',
                        firstName: 'john',
                        lastName: 'doe',
                        dateOfBirth: '1991-03-15',
                        locationId: 1,
                        allowSecondaryFamilyMembers: true
                    }
                },
                {tenantId: 1}
            );

            expect(result).toEqual(null);
            expect(ohanaSharedPackage.createAuditEvent).toHaveBeenCalledTimes(0);
        });
    });
});
