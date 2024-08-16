const createAuditReport = require('./CreateAuditReportSchemaValidation');

describe('Given we want to validate the Graphql schema for creating an audit report generation mutation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await createAuditReport.validateAsync({
                input: {startDate: '2021-08-01', endDate: '2021-09-01', includeMedia: true}
            });
            expect(result).toEqual(
                expect.objectContaining({
                    input: {
                        startDate: new Date('2021-08-01'),
                        endDate: new Date('2021-09-01'),
                        includeMedia: true
                    }
                })
            );
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no input is provided', () => {
            it('then it should throw', async () => {
                await createAuditReport
                    .validateAsync({})
                    .catch((err) => expect(err.details[0].message).toBe('"input" is required'));
            });
        });

        describe('and required args are missing', () => {
            it('then it should throw', async () => {
                await createAuditReport
                    .validateAsync({input: {}}, {abortEarly: false})
                    .catch((err) => {
                        expect(err.details.length).toBe(2);
                        expect(err.details[0].message).toBe('"input.endDate" is required');
                        expect(err.details[1].message).toBe('"input.startDate" is required');
                    });
            });
        });

        describe('and start date is greater than end date', () => {
            it('then it should throw', async () => {
                await createAuditReport
                    .validateAsync({input: {startDate: '2021-09-01', endDate: '2021-08-01'}})
                    .catch((err) => {
                        expect(err.details.length).toBe(1);
                        expect(err.details[0].message).toBe(
                            '"input.startDate" must be less than or equal to "ref:endDate"'
                        );
                    });
            });
        });

        describe('and end date is greater than current date', () => {
            it('then it should throw', async () => {
                await createAuditReport
                    .validateAsync({input: {startDate: '2021-09-01', endDate: '2030-08-01'}})
                    .catch((err) => {
                        expect(err.details.length).toBe(1);
                        expect(err.details[0].message).toBe(
                            '"input.endDate" must be less than or equal to "now"'
                        );
                    });
            });
        });

        describe('and difference between dates is greater than 90 days', () => {
            it('then it should throw', async () => {
                await createAuditReport
                    .validateAsync(
                        {input: {startDate: '2020-09-01', endDate: '2021-08-01'}},
                        {abortEarly: false}
                    )
                    .catch((err) => {
                        expect(err.details.length).toBe(1);
                        expect(err.details[0].message).toBe(
                            '"input" failed custom validation because Difference between dates cannot be greater than 90 days'
                        );
                    });
            });
        });

        describe('and start date is before 2020-01-01', () => {
            it('then it should throw', async () => {
                await createAuditReport
                    .validateAsync(
                        {input: {startDate: '2019-01-01', endDate: '2021-08-01'}},
                        {abortEarly: false}
                    )
                    .catch((err) => {
                        expect(err.details.length).toBe(1);
                        expect(err.details[0].message).toBe(
                            '"input.startDate" must be greater than or equal to "2020-01-01T00:00:00.000Z"'
                        );
                    });
            });
        });

        describe('and dates are not ISO8601 compliant', () => {
            it('then it should throw', async () => {
                await createAuditReport
                    .validateAsync(
                        {input: {startDate: '01-01-2021', endDate: '08-01-2021'}},
                        {abortEarly: false}
                    )
                    .catch((err) => {
                        expect(err.details.length).toBe(2);
                        expect(err.details[0].message).toBe(
                            '"input.endDate" must be in ISO 8601 date format'
                        );
                        expect(err.details[1].message).toBe(
                            '"input.startDate" must be in ISO 8601 date format'
                        );
                    });
            });
        });
    });
});
