let redisFactory = null,
    database = null,
    redisGW = null;

beforeEach(async () => {
    jest.mock('../RedisPoolFactory', () => {
        return {
            getRedisPool: jest.fn(() => {
                return {
                    spareResourceCapacity: '1 redis',
                    size: 1,
                    available: true,
                    borrowed: true,
                    pending: false,
                    max: 10,
                    min: 1
                };
            })
        };
    });

    jest.mock('../DatabasePoolFactory', () => {
        return {
            getDatabasePool: jest.fn(() => {
                return {
                    spareResourceCapacity: '1 database',
                    size: 1,
                    available: true,
                    borrowed: true,
                    pending: false,
                    max: 10,
                    min: 1
                };
            })
        };
    });

    jest.mock('../HttpPoolFactory', () => {
        return {
            getHttpPool: jest.fn(() => {
                return {
                    spareResourceCapacity: '1 rabbitmq http pool',
                    size: 1,
                    available: true,
                    borrowed: true,
                    pending: false,
                    max: 10,
                    min: 1
                };
            })
        };
    });

    jest.mock('../csa/RabbitMQPoolFactory', () => {
        return {
            getRabbitMQPool: jest.fn(() => {
                return {
                    spareResourceCapacity: '1 rabbitmq amq pool',
                    size: 1,
                    available: true,
                    borrowed: true,
                    pending: false,
                    max: 10,
                    min: 1
                };
            })
        };
    });

    jest.mock('../constants', () => ({
        DB_CONNECTION_POOLS: {
            DEFAULT: 'default',
            HEALTH: 'health',
            REPORT: 'report',
            LOGS: 'logs'
        },
        REDIS_CONNECTION_POOLS: {
            DEFAULT: 'default',
            HEALTH: 'health'
        },
        HTTP_CONNECTION_POOLS: {
            CSA: 'csa',
            RMQ_API: 'rmq-api',
            DHP: 'dhp'
        },
        RABBITMQ_CONNECTION_POOLS: {
            HEALTH: 'health',
            CONSUMER: 'consumer',
            INFRA: 'infra'
        },
        DISABLE_CSA_INTEGRATION: false
    }));

    jest.mock('../RedisGateway', () => {
        return {
            getInfo: jest.fn(() => {
                return 'Keyspace Info';
            })
        };
    });

    redisFactory = require('../RedisPoolFactory');
    database = require('../DatabasePoolFactory');
    redisGW = require('../RedisGateway');
});

afterEach(async () => {
    jest.unmock('./HealthDao');
    jest.unmock('../RedisPoolFactory');
    jest.unmock('../DatabasePoolFactory');
    jest.unmock('../RedisGateway');
    jest.unmock('../csa/RabbitMQPoolFactory');
    jest.unmock('../HttpPoolFactory');
});

describe('Given we want to get the pool stats', () => {
    describe('given there are no errors', () => {
        it('then it should have the correct pool payload for the db object', () => {
            const {getAllPoolStats} = require('./HealthDao');

            const result = getAllPoolStats();
            expect(result).not.toBeNull();
        });

        describe('when CSA integration is not disabled', () => {
            it('then it should have the correct pool payload for five objects', () => {
                const {getAllPoolStats} = require('./HealthDao');

                const result = getAllPoolStats();
                expect(result).toHaveProperty('db');
                expect(result).toHaveProperty('redis');
                expect(result).toHaveProperty('dhpHttpPool');
                expect(result).toHaveProperty('rabbitmqHttp');
                expect(result).toHaveProperty('rabbitmqAmqpPool');
            });

            it('then it should have the correct pool payload for the db object', () => {
                const {getAllPoolStats} = require('./HealthDao');

                const result = getAllPoolStats();

                expect(result.db).toHaveProperty('default');
                expect(result.db).toHaveProperty('health');
                expect(result.db).toHaveProperty('report');
                expect(result.db).toHaveProperty('logs');

                expect(result.db.default.spareResourceCapacity).toEqual('1 database');
                expect(result.db.default.size).toEqual(1);
                expect(result.db.default.available).toEqual(true);
                expect(result.db.default.borrowed).toEqual(true);
                expect(result.db.default.pending).toEqual(false);
                expect(result.db.default.max).toEqual(10);
                expect(result.db.default.min).toEqual(1);
            });

            it('then it should have the correct pool payload for the redis object', () => {
                const {getAllPoolStats} = require('./HealthDao');

                const result = getAllPoolStats();

                expect(result.redis).toHaveProperty('default');
                expect(result.redis).toHaveProperty('health');
                expect(result.redis).not.toHaveProperty('logs');

                expect(result.redis.default.spareResourceCapacity).toEqual('1 redis');
                expect(result.redis.default.size).toEqual(1);
                expect(result.redis.default.available).toEqual(true);
                expect(result.redis.default.borrowed).toEqual(true);
                expect(result.redis.default.pending).toEqual(false);
                expect(result.redis.default.max).toEqual(10);
                expect(result.redis.default.min).toEqual(1);
            });

            it('then it should have the correct pool payload for the dhpHttpPool object', () => {
                const {getAllPoolStats} = require('./HealthDao');

                const result = getAllPoolStats();

                expect(result.dhpHttpPool).toHaveProperty('dhp');

                expect(result.dhpHttpPool.dhp.spareResourceCapacity).toEqual(
                    '1 rabbitmq http pool'
                );
                expect(result.dhpHttpPool.dhp.size).toEqual(1);
                expect(result.dhpHttpPool.dhp.available).toEqual(true);
                expect(result.dhpHttpPool.dhp.borrowed).toEqual(true);
                expect(result.dhpHttpPool.dhp.pending).toEqual(false);
                expect(result.dhpHttpPool.dhp.max).toEqual(10);
                expect(result.dhpHttpPool.dhp.min).toEqual(1);
            });

            it('then it should have the correct pool payload for the rabbitmqHttp object', () => {
                const {getAllPoolStats} = require('./HealthDao');

                const result = getAllPoolStats();

                expect(result.rabbitmqHttp).toHaveProperty('rmq-api');
                expect(result.rabbitmqHttp).toHaveProperty('csa');

                expect(result.rabbitmqHttp.csa.spareResourceCapacity).toEqual(
                    '1 rabbitmq http pool'
                );
                expect(result.rabbitmqHttp.csa.size).toEqual(1);
                expect(result.rabbitmqHttp.csa.available).toEqual(true);
                expect(result.rabbitmqHttp.csa.borrowed).toEqual(true);
                expect(result.rabbitmqHttp.csa.pending).toEqual(false);
                expect(result.rabbitmqHttp.csa.max).toEqual(10);
                expect(result.rabbitmqHttp.csa.min).toEqual(1);
            });

            it('then it should have the correct pool payload for the rabbitmqAmqpPool object', () => {
                const {getAllPoolStats} = require('./HealthDao');

                const result = getAllPoolStats();

                expect(result.rabbitmqAmqpPool).toHaveProperty('health');
                expect(result.rabbitmqAmqpPool).toHaveProperty('consumer');
                expect(result.rabbitmqAmqpPool).toHaveProperty('infra');

                expect(result.rabbitmqAmqpPool.health.spareResourceCapacity).toEqual(
                    '1 rabbitmq amq pool'
                );
                expect(result.rabbitmqAmqpPool.health.size).toEqual(1);
                expect(result.rabbitmqAmqpPool.health.available).toEqual(true);
                expect(result.rabbitmqAmqpPool.health.borrowed).toEqual(true);
                expect(result.rabbitmqAmqpPool.health.pending).toEqual(false);
                expect(result.rabbitmqAmqpPool.health.max).toEqual(10);
                expect(result.rabbitmqAmqpPool.health.min).toEqual(1);
            });
        });

        describe('when CSA integration is disabled', () => {
            jest.mock('../constants', () => {
                return {DISABLE_CSA_INTEGRATION: false};
            });
            it('then it should have the correct pool payload for three objects', () => {
                const {getAllPoolStats} = require('./HealthDao');

                const result = getAllPoolStats();
                expect(result).toHaveProperty('db');
                expect(result).toHaveProperty('redis');
                expect(result).toHaveProperty('dhpHttpPool');
            });

            it('then it should have the correct pool payload for the db object', () => {
                const {getAllPoolStats} = require('./HealthDao');

                const result = getAllPoolStats();

                expect(result.db).toHaveProperty('default');
                expect(result.db).toHaveProperty('health');
                expect(result.db).toHaveProperty('report');
                expect(result.db).toHaveProperty('logs');

                expect(result.db.default.spareResourceCapacity).toEqual('1 database');
                expect(result.db.default.size).toEqual(1);
                expect(result.db.default.available).toEqual(true);
                expect(result.db.default.borrowed).toEqual(true);
                expect(result.db.default.pending).toEqual(false);
                expect(result.db.default.max).toEqual(10);
                expect(result.db.default.min).toEqual(1);
            });

            it('then it should have the correct pool payload for the redis object', () => {
                const {getAllPoolStats} = require('./HealthDao');

                const result = getAllPoolStats();

                expect(result.redis).toHaveProperty('default');
                expect(result.redis).toHaveProperty('health');
                expect(result.redis).not.toHaveProperty('logs');

                expect(result.redis.default.spareResourceCapacity).toEqual('1 redis');
                expect(result.redis.default.size).toEqual(1);
                expect(result.redis.default.available).toEqual(true);
                expect(result.redis.default.borrowed).toEqual(true);
                expect(result.redis.default.pending).toEqual(false);
                expect(result.redis.default.max).toEqual(10);
                expect(result.redis.default.min).toEqual(1);
            });

            it('then it should have the correct pool payload for the dhpHttpPool object', () => {
                const {getAllPoolStats} = require('./HealthDao');

                const result = getAllPoolStats();

                expect(result.dhpHttpPool).toHaveProperty('dhp');

                expect(result.dhpHttpPool.dhp.spareResourceCapacity).toEqual(
                    '1 rabbitmq http pool'
                );
                expect(result.dhpHttpPool.dhp.size).toEqual(1);
                expect(result.dhpHttpPool.dhp.available).toEqual(true);
                expect(result.dhpHttpPool.dhp.borrowed).toEqual(true);
                expect(result.dhpHttpPool.dhp.pending).toEqual(false);
                expect(result.dhpHttpPool.dhp.max).toEqual(10);
                expect(result.dhpHttpPool.dhp.min).toEqual(1);
            });
        });
    });
    describe('given there are  errors', () => {
        it('then an error should be caught if getDatabasePool throws and error', () => {
            database.getDatabasePool.mockImplementation(() => {
                throw new Error();
            });
            const {getAllPoolStats} = require('./HealthDao');

            const result = getAllPoolStats();

            expect(result.db).toHaveProperty('default');
            expect(result.db).toHaveProperty('health');
            expect(result.db).toHaveProperty('report');
            expect(result.db).toHaveProperty('logs');

            expect(JSON.stringify(result.db.default)).toBe('{}');
            expect(JSON.stringify(result.db.health)).toBe('{}');
            expect(JSON.stringify(result.db.report)).toBe('{}');
            expect(JSON.stringify(result.db.logs)).toBe('{}');

            expect(result.redis).toHaveProperty('default');
            expect(result.redis.default.spareResourceCapacity).toEqual('1 redis');
        });
        it('then an error should be caught if getRedisPool throws and error', () => {
            redisFactory.getRedisPool.mockImplementation(() => {
                throw new Error();
            });
            const {getAllPoolStats} = require('./HealthDao');

            const result = getAllPoolStats();

            expect(result.redis).toHaveProperty('default');
            expect(result.redis).toHaveProperty('health');
            expect(result.redis).not.toHaveProperty('logs');

            expect(JSON.stringify(result.redis.default)).toBe('{}');
            expect(JSON.stringify(result.redis.health)).toBe('{}');

            expect(result.db.default.spareResourceCapacity).toEqual('1 database');
        });
        //add test for dhpHttpPool
        // add test for rabbitmqHttp
        // add test for rabbitmqAmqpPool
    });
});

describe('Given we want to get the Migration Version', () => {
    describe('given there are rows returned', () => {
        it('then it should have the correct pool payload for the key space info', async () => {
            const {getMigrationVersion} = require('./HealthDao');
            database.getDatabasePool.mockImplementation(() => {
                return {
                    query: jest.fn(() => {
                        return {rows: [{version: '1'}]};
                    })
                };
            });

            const result = await getMigrationVersion();

            expect(result).toEqual('1');
        });
    });

    describe('given there arent any rows found in the database', () => {
        it('then an error should be thrown', async () => {
            const {getMigrationVersion} = require('./HealthDao');
            database.getDatabasePool.mockImplementation(() => {
                return {
                    query: jest.fn(() => {
                        return {rows: []};
                    })
                };
            });

            await expect(getMigrationVersion()).rejects.toThrow();
        });
    });
});

describe('Given we want to get the key space info', () => {
    describe('given there are no errors', () => {
        it('then it should have the correct pool payload for the key space info', async () => {
            const {getKeyspaceInfo} = require('./HealthDao');
            redisFactory.getRedisPool.mockImplementation(() => {
                return {
                    acquire: jest.fn(() => 'client'),
                    release: jest.fn()
                };
            });

            const result = await getKeyspaceInfo();

            expect(result).not.toBeNull();
            expect(result).toEqual('Keyspace Info');
        });
    });

    describe('given there are errors', () => {
        it('then an error should be thrown', async () => {
            const {getKeyspaceInfo} = require('./HealthDao');
            redisFactory.getRedisPool.mockImplementation(() => {
                return {
                    acquire: jest.fn(() => 'client'),
                    release: jest.fn()
                };
            });
            redisGW.getInfo.mockImplementation(() => {
                throw new Error();
            });

            await expect(getKeyspaceInfo()).rejects.toThrow();
        });
    });
});

describe('Given we want to get the Manifest Version', () => {
    const device = {
        appVersion: '2.0.0'
    };

    it('then the manifest version should be returned', async () => {
        const {getManifestVersion} = require('./HealthDao');
        redisGW.getInfo.mockImplementation(() => {
            throw new Error();
        });

        const result = getManifestVersion();

        await expect(result).toEqual(device.appVersion);
    });
});
