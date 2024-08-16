const updateLocationQuickMessagesOrder = require('./UpdateLocationQuickMessagesOrderResolverSchemaValidation');

describe('Given we want to validate the Graphql schema for updating location quick messages order mutation', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await updateLocationQuickMessagesOrder.validateAsync({
                locationId: 1,
                quickMessagesOrder: [1, 2]
            });
            expect(result).toEqual(
                expect.objectContaining({
                    locationId: 1,
                    quickMessagesOrder: [1, 2]
                })
            );
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no input is provided', () => {
            it('then it should throw', async () => {
                await updateLocationQuickMessagesOrder
                    .validateAsync({}, {abortEarly: false})
                    .catch((err) => {
                        expect(err.details.length).toBe(1);
                        expect(err.details[0].message).toBe('"quickMessagesOrder" is required');
                    });
            });
        });

        describe('and number is provided instead of string', () => {
            it('then it should throw', async () => {
                await updateLocationQuickMessagesOrder
                    .validateAsync({
                        locationId: '1',
                        quickMessagesOrder: [1, 2]
                    })
                    .catch((err) =>
                        expect(err.details[0].message).toBe('"locationId" must be a number')
                    );
            });
        });
    });
});
