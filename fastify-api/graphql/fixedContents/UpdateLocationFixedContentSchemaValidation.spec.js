const locationFixedContents = require('./UpdateLocationFixedContentSchemaValidation');

describe('Given we want to validate the Graphql schema to update a location`s fixed contents', () => {
    describe('when valid schema is provided', () => {
        it('then it should return the schema', async () => {
            const result = await locationFixedContents.validateAsync({
                fixedContentId: 1,
                fixedContent: {
                    title: 'Yahoo',
                    url: 'http://www.yahoo.com',
                    color: 'blue'
                }
            });
            expect(result).toEqual({
                fixedContentId: 1,
                fixedContent: {
                    title: 'Yahoo',
                    url: 'http://www.yahoo.com',
                    color: 'blue'
                }
            });
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no fixedContentId or fixedContent is provided', () => {
            it('then it should throw', async () => {
                await locationFixedContents.validateAsync({}, {abortEarly: false}).catch((err) => {
                    expect(err.details.length).toBe(2);
                    expect(err.details[0].message).toBe('"fixedContentId" is required');
                    expect(err.details[1].message).toBe('"fixedContent" is required');
                });
            });
        });

        describe('and incomplete fixedContent is provided', () => {
            it('then it should throw', async () => {
                await locationFixedContents
                    .validateAsync({fixedContentId: 1, fixedContent: {}}, {abortEarly: false})
                    .catch((err) => {
                        expect(err.details.length).toBe(3);
                        expect(err.details[0].message).toBe('"fixedContent.title" is required');
                        expect(err.details[1].message).toBe('"fixedContent.url" is required');
                        expect(err.details[2].message).toBe('"fixedContent.color" is required');
                    });
            });
        });

        describe('and invalid types are provided', () => {
            it('then it should throw', async () => {
                await locationFixedContents
                    .validateAsync(
                        {
                            fixedContentId: 'abc',
                            fixedContent: {
                                title: 123,
                                url: 'http:/www.yahoo.com',
                                color: 123
                            }
                        },
                        {abortEarly: false}
                    )
                    .catch((err) => {
                        expect(err.details.length).toBe(4);
                        expect(err.details[0].message).toBe('"fixedContentId" must be a number');
                        expect(err.details[1].message).toBe(
                            '"fixedContent.title" must be a string'
                        );
                        expect(err.details[2].message).toBe(
                            '"fixedContent.url" must be a valid uri'
                        );
                        expect(err.details[3].message).toBe(
                            '"fixedContent.color" must be a string'
                        );
                    });
            });
        });

        describe('and invalid length fixedContent is provided', () => {
            it('then it should throw if the title length is too long', async () => {
                await locationFixedContents
                    .validateAsync(
                        {
                            fixedContentId: 1,
                            fixedContent: {
                                title: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
                                url: 'http://www.yahoo.com',
                                color: 'blue'
                            }
                        },
                        {abortEarly: false}
                    )
                    .catch((err) => {
                        expect(err.details.length).toBe(1);
                        expect(err.details[0].message).toBe(
                            '"fixedContent.title" length must be less than or equal to 25 characters long'
                        );
                    });
            });
        });
    });
});
