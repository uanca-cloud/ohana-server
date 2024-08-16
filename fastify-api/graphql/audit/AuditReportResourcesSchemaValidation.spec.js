const auditReportResources = require('./AuditReportResourcesSchemaValidation');

describe('Given we want to validate the Graphql schema to get audit report download links', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await auditReportResources.validateAsync({id: '0297ca6e-29b6-4495'});
            expect(result).toEqual(expect.objectContaining({id: '0297ca6e-29b6-4495'}));
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no input is provided', () => {
            it('then it should throw', async () => {
                await auditReportResources
                    .validateAsync({})
                    .catch((err) => expect(err.details[0].message).toBe('"id" is required'));
            });
        });
    });
});
