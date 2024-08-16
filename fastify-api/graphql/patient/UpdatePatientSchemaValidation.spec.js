const updatePatient = require('./UpdatePatientSchemaValidation');

describe('Given we want to validate the Graphql schema for update patient mutation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await updatePatient.validateAsync({
                patient: {
                    id: 15,
                    firstName: 'rox',
                    lastName: 'roxanananaan',
                    dateOfBirth: '1991-03-15',
                    location: 1
                }
            });
            expect(result).toEqual(
                expect.objectContaining({
                    patient: {
                        id: 15,
                        firstName: 'rox',
                        lastName: 'roxanananaan',
                        dateOfBirth: new Date('1991-03-15T00:00:00.000Z'),
                        location: 1
                    }
                })
            );
        });

        it('it should allow null for location id', async () => {
            const result = await updatePatient.validateAsync({
                patient: {
                    id: 15,
                    firstName: 'rox',
                    lastName: 'roxanananaan',
                    dateOfBirth: '1991-03-15',
                    location: null
                }
            });
            expect(result).toEqual(
                expect.objectContaining({
                    patient: {
                        id: 15,
                        firstName: 'rox',
                        lastName: 'roxanananaan',
                        dateOfBirth: new Date('1991-03-15T00:00:00.000Z'),
                        location: null
                    }
                })
            );
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no input is provided', () => {
            it('then it should throw', async () => {
                await updatePatient
                    .validateAsync({})
                    .catch((err) => expect(err.details[0].message).toBe('"patient" is required'));
            });
        });

        describe('and invalid first name is provided', () => {
            it('then it should throw', async () => {
                await updatePatient
                    .validateAsync({
                        patient: {
                            id: '111212',
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
                await updatePatient
                    .validateAsync({
                        patient: {
                            id: '111212',
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
                await updatePatient
                    .validateAsync({patient: {dateOfBirth: '1991-03-15'}}, {abortEarly: false})
                    .catch((err) => {
                        expect(err.details.length).toBe(4);
                        expect(err.details[0].message).toBe('"patient.id" is required');
                        expect(err.details[1].message).toBe('"patient.firstName" is required');
                        expect(err.details[2].message).toBe('"patient.lastName" is required');
                        expect(err.details[3].message).toBe('"patient.location" is required');
                    });
            });
        });

        describe('and empty input is provided', () => {
            it('then it should throw', async () => {
                await updatePatient
                    .validateAsync({patient: {}}, {abortEarly: false})
                    .catch((err) => expect(err.details.length).toBe(5));
            });
        });

        describe('and string is provided instead of number', () => {
            it('then it should throw', async () => {
                await updatePatient
                    .validateAsync({
                        patient: {
                            id: '15',
                            firstName: 'rox',
                            lastName: 'roxanananaan',
                            dateOfBirth: '1991-03-15',
                            location: 1
                        }
                    })
                    .catch((err) => expect(err.details[0].message).toBe('"id" must be a number'));
            });
        });

        describe('and empty spaces are provided for first name and last name', () => {
            it('then it should throw', async () => {
                await updatePatient
                    .validateAsync(
                        {
                            patient: {
                                id: '15',
                                firstName: '   ',
                                lastName: '  ',
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

        describe('and invalid external id value is provided', () => {
            it('then it should throw', async () => {
                await updatePatient
                    .validateAsync({
                        patient: {
                            id: '111212',
                            firstName: 'jane',
                            lastName: 'doe',
                            dateOfBirth: '1991-03-15',
                            location: 1,
                            externalId: 2
                        }
                    })
                    .catch((err) => {
                        expect(err.details.length).toBe(1);
                        expect(err.details[0].message).toBe(
                            '"patient.externalId" must be a string'
                        );
                    });
            });
        });

        describe('and date of birth is in the future', () => {
            it('then it should throw', async () => {
                await updatePatient
                    .validateAsync({
                        patient: {
                            id: '111212',
                            firstName: 'jane',
                            lastName: 'doe',
                            dateOfBirth: '2991-03-15',
                            location: 1
                        }
                    })
                    .catch((err) => {
                        expect(err.details.length).toBe(1);
                        expect(err.details[0].message).toBe(
                            '"patient.dateOfBirth" must be less than or equal to "now"'
                        );
                    });
            });
        });
    });
});
