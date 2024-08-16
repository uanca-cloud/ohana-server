const enrollPatient = require('./EnrollPatientSchemaValidation');

describe('Given we want to validate the Graphql schema for enroll patient mutation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await enrollPatient.validateAsync({
                patient: {
                    externalId: '111212',
                    firstName: 'rox',
                    lastName: 'rox',
                    dateOfBirth: '1991-03-15',
                    location: 1,
                    allowSecondaryFamilyMembers: false
                }
            });
            expect(result).toEqual(
                expect.objectContaining({
                    patient: {
                        dateOfBirth: new Date('1991-03-15T00:00:00.000Z'),
                        externalId: '111212',
                        firstName: 'rox',
                        lastName: 'rox',
                        location: 1,
                        allowSecondaryFamilyMembers: false
                    }
                })
            );
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no input is provided', () => {
            it('then it should throw', async () => {
                await enrollPatient
                    .validateAsync({})
                    .catch((err) => expect(err.details[0].message).toBe('"patient" is required'));
            });
        });

        describe('and invalid first name is provided', () => {
            it('then it should throw', async () => {
                await enrollPatient
                    .validateAsync({
                        patient: {
                            externalId: '111212',
                            firstName:
                                'very long first name very long first name very long first name very long first name very long first name very long first name very long first name very long first name',
                            lastName: 'rox',
                            dateOfBirth: '1991-03-15',
                            location: 1
                        }
                    })
                    .catch((err) => {
                        expect(err.details.length).toBe(1);
                        expect(err.details[0].message).toBe(
                            '"patient.firstName" length must be less than or equal to 50 characters long'
                        );
                    });
            });
        });

        describe('and invalid last name is provided', () => {
            it('then it should throw', async () => {
                await enrollPatient
                    .validateAsync({
                        patient: {
                            externalId: '111212',
                            firstName: 'rox',
                            lastName:
                                'very long last name very long last name very long last name very long last name very long last name',
                            dateOfBirth: '1991-03-15',
                            location: 1
                        }
                    })
                    .catch((err) => {
                        expect(err.details.length).toBe(1);
                        expect(err.details[0].message).toBe(
                            '"patient.lastName" length must be less than or equal to 50 characters long'
                        );
                    });
            });
        });

        describe('and required args are missing', () => {
            it('then it should throw', async () => {
                await enrollPatient
                    .validateAsync({patient: {dateOfBirth: '1991-03-15'}}, {abortEarly: false})
                    .catch((err) => {
                        expect(err.details.length).toBe(4);
                        expect(err.details[0].message).toBe('"patient.externalId" is required');
                        expect(err.details[1].message).toBe('"patient.firstName" is required');
                        expect(err.details[2].message).toBe('"patient.lastName" is required');
                        expect(err.details[3].message).toBe('"patient.location" is required');
                    });
            });
        });

        describe('and empty input is provided', () => {
            it('then it should throw', async () => {
                await enrollPatient
                    .validateAsync({patient: {}}, {abortEarly: false})
                    .catch((err) => expect(err.details.length).toBe(5));
            });
        });

        describe('and empty spaces are provided for first name and last name', () => {
            it('then it should throw', async () => {
                await enrollPatient
                    .validateAsync(
                        {
                            patient: {
                                externalId: '111212',
                                firstName: '    ',
                                lastName: '   ',
                                dateOfBirth: '1991-03-15',
                                location: 1
                            }
                        },
                        {abortEarly: false}
                    )
                    .catch((err) => {
                        expect(err.details.length).toBe(2);
                        expect(err.details[0].message).toBe(
                            '"patient.firstName" is not allowed to be empty'
                        );
                        expect(err.details[1].message).toBe(
                            '"patient.lastName" is not allowed to be empty'
                        );
                    });
            });
        });
    });
});
