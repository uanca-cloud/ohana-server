const {
        EXTERNAL_ID_TYPES,
        OUTBOUND_CALL_FORMAT_DEFAULT,
        TENANT_SETTINGS_KEYS: {EXTERNAL_ID_TYPE, OUTBOUND_CALL_FORMAT}
    } = require('../constants'),
    {
        tenantSettingsFixtures: {tenantSettings1, tenantSettings2, tenantSettings3}
    } = require('../test/fixtures/TenantSettingsFixtures');

let pool = null,
    bootstrapTest = null,
    truncateTables = null,
    insertTestTenantSetting = null,
    selectTestTenantSetting = null;

beforeEach(async () => {
    bootstrapTest = require('../test/DatabaseIntegrationTestHelper').bootstrapTest;
    truncateTables = require('../test/DatabaseIntegrationTestHelper').truncateTables;
    insertTestTenantSetting =
        require('../test/fixtures/TenantSettingsFixtures').insertTestTenantSetting;
    selectTestTenantSetting =
        require('../test/fixtures/TenantSettingsFixtures').selectTestTenantSetting;

    pool = bootstrapTest();
    await truncateTables(pool, ['tenant_settings']);
});

afterEach(async () => {
    await truncateTables(pool, ['tenant_settings']);
    await pool.drain().then(() => pool.clear());
});

describe('Given we want to query the database for tenant settings', () => {
    describe('when getting key tenant setting for all tenants', () => {
        it('then the correct values should be returned', async () => {
            const {getKeySettings} = require('./TenantSettingsDao');

            await insertTestTenantSetting(pool, tenantSettings2);
            await insertTestTenantSetting(pool, tenantSettings3);
            const result = await getKeySettings(tenantSettings2.key);

            expect(result[0].tenantId).toBe(tenantSettings2.tenantId);
            expect(result[0].value).toBe(tenantSettings2.value);

            expect(result[1].tenantId).toBe(tenantSettings3.tenantId);
            expect(result[1].value).toBe(tenantSettings3.value);
        });
    });

    describe('when getting the external id type of a tenant', () => {
        it('then the correct value should be returned', async () => {
            const {getTenantSetting} = require('./TenantSettingsDao');

            await insertTestTenantSetting(pool, tenantSettings1);
            const result = await getTenantSetting({
                tenantId: tenantSettings1.tenantId,
                key: tenantSettings1.key
            });

            expect(result.key).toBe(tenantSettings1.key);
            expect(result.value).toBe(tenantSettings1.value);
        });
    });

    describe('when getting all the settings of a tenant', () => {
        it('then all values should be returned', async () => {
            const {getTenantSettings} = require('./TenantSettingsDao');

            await insertTestTenantSetting(pool, tenantSettings1);
            const result = await getTenantSettings({tenantId: tenantSettings1.tenantId});

            expect(result.length).toBe(1);
            expect(result[0].key).toBe(tenantSettings1.key);
            expect(result[0].value).toBe(tenantSettings1.value);
        });
    });

    describe('when updating an external id type of a tenant', () => {
        it('then the new value should be returned', async () => {
            const {updateTenantSetting} = require('./TenantSettingsDao');

            await insertTestTenantSetting(pool, tenantSettings1);
            await updateTenantSetting({
                tenantId: tenantSettings1.tenantId,
                value: 'RMN2',
                key: tenantSettings1.key
            });
            const result = await selectTestTenantSetting(pool, {
                tenantId: tenantSettings1.tenantId,
                key: tenantSettings1.key
            });

            expect(result.rows[0].value).toBe('RMN2');
        });
    });

    describe('when updating a setting of a different tenant', () => {
        it('then nothing should happen', async () => {
            const {updateTenantSetting} = require('./TenantSettingsDao');

            await insertTestTenantSetting(pool, tenantSettings1);
            await updateTenantSetting({tenantId: '99', key: tenantSettings1.key, value: 'RMN2'});
            const result = await selectTestTenantSetting(pool, {
                tenantId: tenantSettings1.tenantId,
                key: tenantSettings1.key
            });

            expect(result.rows[0].value).toBe(tenantSettings1.value);
        });
    });

    describe('when creating the default tenant settings', () => {
        it('then the correct value should be inserted', async () => {
            const {insertDefaultTenantSettings} = require('./TenantSettingsDao');

            const defaultValue = EXTERNAL_ID_TYPES[0] || null;
            await insertDefaultTenantSettings([
                {tenantId: 'abcd-abcd-abcd', key: EXTERNAL_ID_TYPE, value: defaultValue},
                {
                    tenantId: 'abcd-abcd-abcd',
                    key: OUTBOUND_CALL_FORMAT,
                    value: OUTBOUND_CALL_FORMAT_DEFAULT
                }
            ]);
            const result = await selectTestTenantSetting(pool, {
                tenantId: 'abcd-abcd-abcd',
                key: EXTERNAL_ID_TYPE
            });
            const result2 = await selectTestTenantSetting(pool, {
                tenantId: 'abcd-abcd-abcd',
                key: OUTBOUND_CALL_FORMAT
            });

            expect(result.rows[0].value).toBe(defaultValue);
            expect(result.rows[0].tenant_id).toBe('abcd-abcd-abcd');
            expect(result.rows[0].key).toBe(EXTERNAL_ID_TYPE);
            expect(result2.rows[0].value).toBe(OUTBOUND_CALL_FORMAT_DEFAULT);
            expect(result2.rows[0].tenant_id).toBe('abcd-abcd-abcd');
            expect(result2.rows[0].key).toBe(OUTBOUND_CALL_FORMAT);
        });
    });

    describe('when trying to insert duplicated tenant setting', () => {
        it('then only one row should be inserted', async () => {
            const {insertDefaultTenantSettings} = require('./TenantSettingsDao');

            await insertDefaultTenantSettings([{...tenantSettings1}]);
            await insertDefaultTenantSettings([{...tenantSettings1}]);
            const result = await selectTestTenantSetting(pool, {
                tenantId: tenantSettings1.tenantId,
                key: tenantSettings1.key
            });

            expect(result.rowCount).toBe(1);
        });
    });

    describe('when trying to insert duplicated tenant setting, but different value', () => {
        it('then the old value should be returned', async () => {
            const {insertDefaultTenantSettings} = require('./TenantSettingsDao');

            await insertDefaultTenantSettings([{...tenantSettings1}]);
            await insertDefaultTenantSettings([{...tenantSettings1, value: 'MRN2'}]);
            const result = await selectTestTenantSetting(pool, {
                tenantId: tenantSettings1.tenantId,
                key: tenantSettings1.key
            });

            expect(result.rows[0].value).toBe(tenantSettings1.value);
        });
    });
});
