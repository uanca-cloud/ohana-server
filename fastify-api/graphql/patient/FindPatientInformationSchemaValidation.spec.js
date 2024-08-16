const findPatientInformation = require('./FindPatientInformationSchemaValidation');

describe('Given we want to validate the Graphql schema for finding the patient patient information', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await findPatientInformation.validateAsync({
                bearerToken: 'eyJhbGciOiJIUzI1NiIs',
                externalId: '242084b9-7b22-4fec-9cbe-4234e11a55fe',
                externalIdType: 'MRN'
            });
            expect(result).toEqual(
                expect.objectContaining({
                    bearerToken: 'eyJhbGciOiJIUzI1NiIs',
                    externalId: '242084b9-7b22-4fec-9cbe-4234e11a55fe'
                })
            );
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no input is provided', () => {
            it('then it should throw', async () => {
                await findPatientInformation
                    .validateAsync({}, {abortEarly: false})
                    .catch((err) => {
                        expect(err.details.length).toBe(3);
                        expect(err.details[0].message).toBe('"bearerToken" is required');
                        expect(err.details[1].message).toBe('"externalId" is required');
                        expect(err.details[2].message).toBe('"externalIdType" is required');
                    });
            });
        });

        describe('and number is provided as a token instead of string', () => {
            it('then it should throw', async () => {
                await findPatientInformation
                    .validateAsync({
                        bearerToken: 11111,
                        externalId: '242084b9-7b22-4fec-9cbe-4234e11a55fe',
                        externalIdType: 'MRN'
                    })
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"bearerToken" must be a string')
                    );
            });
        });

        describe('and number is provided as an externalId instead of string', () => {
            it('then it should throw', async () => {
                await findPatientInformation
                    .validateAsync({
                        bearerToken: 'eyJhbGciOiJIUzI1NiIs',
                        externalId: 111,
                        externalIdType: 'MRN'
                    })
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"externalId" must be a string')
                    );
            });
        });

        describe('and number is provided as an externalIdType instead of string', () => {
            it('then it should throw', async () => {
                await findPatientInformation
                    .validateAsync({
                        bearerToken: 'eyJhbGciOiJIUzI1NiIs',
                        externalId: '242084b9-7b22-4fec-9cbe-4234e11a55fe',
                        externalIdType: 123
                    })
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"externalIdType" must be a string')
                    );
            });
        });

        describe('and no token is provided', () => {
            it('then it should throw', async () => {
                await findPatientInformation
                    .validateAsync({
                        externalId: '242084b9-7b22-4fec-9cbe-4234e11a55fe',
                        externalIdType: 'MRN'
                    })
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"bearerToken" is required')
                    );
            });
        });

        describe('and no value is provided for externalId', () => {
            it('then it should throw', async () => {
                await findPatientInformation
                    .validateAsync({
                        bearerToken: 'eyJhbGciOiJIUzI1NiIs',
                        externalIdType: 'MRN'
                    })
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"externalId" is required')
                    );
            });
        });

        describe('and no value is provided for externalIdType', () => {
            it('then it should throw', async () => {
                await findPatientInformation
                    .validateAsync({
                        bearerToken: 'eyJhbGciOiJIUzI1NiIs',
                        externalId: '242084b9-7b22-4fec-9cbe-4234e11a55fe'
                    })
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"externalIdType" is required')
                    );
            });
        });
    });
});
