const finalizeFamilyMemberRegistration = require('./FinalizeFamilyMemberRegistrationSchemaValidation');

describe('Given we want to validate the Graphql schema finalize creating a new family member mutation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await finalizeFamilyMemberRegistration.validateAsync({
                familyMember: {
                    phoneNumber: '+000111111111',
                    preferredLocale: 'US',
                    patientDateOfBirth: '1991-03-15',
                    patientRelationship: 'Parent',
                    firstName: 'John',
                    lastName: 'Doe'
                }
            });
            expect(result).toEqual(
                expect.objectContaining({
                    familyMember: {
                        phoneNumber: '000111111111',
                        preferredLocale: 'US',
                        patientDateOfBirth: new Date('1991-03-15T00:00:00.000Z'),
                        patientRelationship: 'Parent',
                        firstName: 'John',
                        lastName: 'Doe'
                    }
                })
            );
        });
    });

    describe('and invalid first name and last name is provided', () => {
        it('then it should throw', async () => {
            await finalizeFamilyMemberRegistration
                .validateAsync(
                    {
                        familyMember: {
                            phoneNumber: '+000111111111',
                            preferredLocale: 'US',
                            patientDateOfBirth: '1991-03-15',
                            patientRelationship: 'Parent',
                            firstName:
                                'First Name First Name First Name First Name First Name First Name First Name First Name First Name First Name First Name First Name',
                            lastName:
                                'Last Name Last Name Last Name Last Name Last Name Last Name Last Name Last Name Last Name Last Name Last Name Last Name'
                        }
                    },
                    {abortEarly: false}
                )
                .catch((err) => {
                    expect(err.details.length).toBe(2);
                    expect(err.details[0].message).toBe(
                        '"familyMember.firstName" length must be less than or equal to 50 characters long'
                    );
                    expect(err.details[1].message).toBe(
                        '"familyMember.lastName" length must be less than or equal to 50 characters long'
                    );
                });
        });
    });

    describe('and invalid phone number length is provided', () => {
        it('then it should throw', async () => {
            await finalizeFamilyMemberRegistration
                .validateAsync(
                    {
                        familyMember: {
                            phoneNumber: '+1.33755444444444444',
                            preferredLocale: 'US',
                            patientDateOfBirth: '1991-03-15',
                            patientRelationship: 'Parent',
                            firstName: 'First Name',
                            lastName: 'Last Name'
                        }
                    },
                    {abortEarly: false}
                )
                .catch((err) => {
                    expect(err.details.length).toBe(1);
                    expect(err.details[0].message).toBe(
                        '"familyMember.phoneNumber" length must be less than or equal to 15 characters long'
                    );
                });
        });
    });

    describe('and invalid device input is provided', () => {
        it('then it should throw', async () => {
            await finalizeFamilyMemberRegistration
                .validateAsync(
                    {
                        familyMember: {
                            phoneNumber: '+000111111111',
                            preferredLocale: 'US',
                            patientDateOfBirth: '1991-03-15',
                            patientRelationship: 'Parent',
                            firstName: 'First Name',
                            lastName: 'Last Name'
                        }
                    },
                    {abortEarly: false}
                )
                .catch((err) => {
                    expect(err.details.length).toBe(3);
                    expect(err.details[0].message).toBe('"device.deviceId" is required');
                    expect(err.details[1].message).toBe('"device.osVersion" is required');
                    expect(err.details[2].message).toBe('"device.deviceModel" is required');
                });
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no input is provided', () => {
            it('then it should throw', async () => {
                await finalizeFamilyMemberRegistration
                    .validateAsync({})
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"familyMember" is required')
                    );
            });
        });

        describe('and required args are missing', () => {
            it('then it should throw', async () => {
                await finalizeFamilyMemberRegistration
                    .validateAsync(
                        {
                            familyMember: {preferredLocale: 'US', firstName: 'John'}
                        },
                        {abortEarly: false}
                    )
                    .catch((err) => {
                        expect(err.details.length).toBe(4);
                        expect(err.details[0].message).toBe(
                            '"familyMember.phoneNumber" is required'
                        );
                        expect(err.details[1].message).toBe(
                            '"familyMember.patientDateOfBirth" is required'
                        );
                        expect(err.details[2].message).toBe(
                            '"familyMember.patientRelationship" is required'
                        );
                        expect(err.details[3].message).toBe('"familyMember.lastName" is required');
                    });
            });
        });

        describe('and empty input is provided', () => {
            it('then it should throw', async () => {
                await finalizeFamilyMemberRegistration
                    .validateAsync({familyMember: {}, device: {}}, {abortEarly: false})
                    .catch((err) => expect(err.details.length).toBe(7));
            });
        });
    });
});
