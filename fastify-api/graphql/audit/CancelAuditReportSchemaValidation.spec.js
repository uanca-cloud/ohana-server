const cancelAuditReport = require('./CancelAuditReportSchemaValidation');

describe('Given we want to validate the Graphql schema to cancel an audit report generation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await cancelAuditReport.validateAsync({id: '0297ca6e-29b6-4495'});
            expect(result).toEqual(expect.objectContaining({id: '0297ca6e-29b6-4495'}));
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no input is provided', () => {
            it('then it should throw', async () => {
                await cancelAuditReport
                    .validateAsync({})
                    .catch((err) => expect(err.details[0].message).toBe('"id" is required'));
            });
        });
    });
});
