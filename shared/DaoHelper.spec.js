jest.mock('./DatabasePoolFactory');

const DatabasePoolFactory = require('./DatabasePoolFactory'),
    {runWithTransaction, runBatchQuery} = require('./DaoHelper');

beforeEach(() => {
    DatabasePoolFactory.getDatabasePool.mockImplementation(() => {
        let _queryStub = jest.fn(),
            _releaseStub = jest.fn();

        return {
            _queryStub,
            _releaseStub,
            acquire: jest.fn(() => Promise.resolve({query: _queryStub})),
            release: _releaseStub,
            query: _queryStub
        };
    });
});

afterEach(() => {
    jest.resetAllMocks();
});

describe('Given we want to execute a db transaction', () => {
    describe('when the client is initiated', () => {
        test('then the db client is obtained', async () => {
            await runWithTransaction(() => {});

            expect(DatabasePoolFactory.getDatabasePool).toHaveBeenCalled();
        });

        test('then the transaction is opened', async () => {
            await runWithTransaction(() => {});

            expect(
                DatabasePoolFactory.getDatabasePool.mock.results[0].value._queryStub
            ).toHaveBeenCalledWith('BEGIN;');
        });

        test('then the client is provided to the handler is opened', async () => {
            await runWithTransaction((client) => {
                expect(client).toBeDefined();
            });
        });

        describe('when the transaction has no errors', () => {
            test('then the transaction commits', async () => {
                await runWithTransaction(() => {});
                expect(
                    DatabasePoolFactory.getDatabasePool.mock.results[0].value._queryStub
                ).toHaveBeenCalledWith('COMMIT;');
            });

            test('then the client is released', async () => {
                await runWithTransaction(() => {});
                expect(
                    DatabasePoolFactory.getDatabasePool.mock.results[0].value._releaseStub
                ).toHaveBeenCalled();
            });

            test('then it returns the resolution of the last statement provided by the caller', async () => {
                let expected = 'test';
                const actual = await runWithTransaction(() => Promise.resolve(expected));
                expect(actual).toEqual(expected);
            });
        });

        describe('when the transaction fails', () => {
            test('then the transaction rolls back', async () => {
                try {
                    await runWithTransaction(() => {
                        throw new Error();
                    });
                } catch (error) {
                    expect(
                        DatabasePoolFactory.getDatabasePool.mock.results[0].value._queryStub
                    ).toHaveBeenCalledWith('ROLLBACK;');
                }
            });

            test('then the client is released', async () => {
                try {
                    await runWithTransaction(() => {
                        throw new Error();
                    });
                } catch (error) {
                    expect(
                        DatabasePoolFactory.getDatabasePool.mock.results[0].value._releaseStub
                    ).toHaveBeenCalled();
                }
            });

            test('then the error is propagated', async () => {
                try {
                    await runWithTransaction(() => {
                        throw new Error();
                    });
                } catch (error) {
                    expect(error).toBeDefined();
                }
            });
        });
    });
});

describe('Given we want to execute a batch query', () => {
    describe('when the client is initialized', () => {
        const items = ['id-1', 'id-2'];
        const query = `
            DELETE * FROM table
            WHERE id = ANY($1);
        `;

        test('then we should run the provided query and params', async () => {
            await runBatchQuery(null, items, query);
            expect(
                DatabasePoolFactory.getDatabasePool.mock.results[0].value._queryStub
            ).toHaveBeenCalledWith(query, [items]);
        });

        test('then we should run the provided query and additional params', async () => {
            const additional = ['additional'];
            await runBatchQuery(null, items, query, additional);
            expect(
                DatabasePoolFactory.getDatabasePool.mock.results[0].value._queryStub
            ).toHaveBeenCalledWith(query, [items, ...additional]);
        });
    });
});
