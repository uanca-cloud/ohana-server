const {
        patientFixtureData: {testPatient1}
    } = require('../test/fixtures/PatientsFixtures'),
    {
        fixtureData: {user2, user3}
    } = require('../test/fixtures/UsersFixtures'),
    {
        fixtureData: {encounter1}
    } = require('../test/fixtures/EncountersFixtures'),
    {
        locationsFixtures: {location1}
    } = require('../test/fixtures/LocationsFixtures'),
    {
        fixtureData: {deviceInfo2}
    } = require('../test/fixtures/DeviceInfoFixtures');

let pool = null,
    patientId = null,
    encounterId = null,
    bootstrapTest = null,
    truncateTables = null,
    createTestPatient = null,
    insertTestUser = null,
    createTestEncounter = null,
    endTestEncounter = null,
    insertTestUserPatientsMapping = null,
    insertTestLocation = null,
    insertTestDeviceInfo = null,
    findTestAuditEventByDeviceId = null;

beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01').getTime());

    patientId = null;
    encounterId = null;

    bootstrapTest = require('../test/DatabaseIntegrationTestHelper').bootstrapTest;
    truncateTables = require('../test/DatabaseIntegrationTestHelper').truncateTables;
    createTestPatient = require('../test/fixtures/PatientsFixtures').createTestPatient;
    insertTestUser = require('../test/fixtures/UsersFixtures').insertTestUser;
    createTestEncounter = require('../test/fixtures/EncountersFixtures').createTestEncounter;
    endTestEncounter = require('../test/fixtures/EncountersFixtures').endTestEncounter;
    insertTestUserPatientsMapping =
        require('../test/fixtures/UserPatientsMappingFixtures').insertTestUserPatientsMapping;
    insertTestLocation = require('../test/fixtures/LocationsFixtures').insertTestLocation;
    insertTestDeviceInfo = require('../test/fixtures/DeviceInfoFixtures').insertTestDeviceInfo;
    findTestAuditEventByDeviceId =
        require('../test/fixtures/AuditFixtures').findTestAuditEventByDeviceId;

    pool = bootstrapTest();

    await truncateTables(pool, [
        'updates',
        'locations',
        'device_info',
        'users_patients_mapping',
        'family_identities',
        'users',
        'encounters',
        'patients'
    ]);
});

afterEach(async () => {
    await truncateTables(pool, [
        'updates',
        'locations',
        'device_info',
        'users_patients_mapping',
        'family_identities',
        'users',
        'encounters',
        'patients'
    ]);
    await pool.drain().then(() => pool.clear());
});

describe('Given we want to query the database for audit events info', () => {
    beforeEach(async () => {
        const locationInsert = await insertTestLocation(pool, location1);
        const locationId = locationInsert.rows[0].id;
        const patientInsert = await createTestPatient(pool, {
            ...testPatient1,
            location: locationId
        });
        await insertTestUser(pool, user2);
        patientId = patientInsert.rows[0].id;
        const encounterInsert = await createTestEncounter(pool, {...encounter1, patientId});
        encounterId = encounterInsert.rows[0].id;
        await insertTestUserPatientsMapping(pool, {userId: user2.userId, patientId, encounterId});
        await insertTestDeviceInfo(pool, deviceInfo2);
    });

    describe('When inserting audit events ', () => {
        it('Then display the inserted fields', async () => {
            const {createAuditEvent} = require('./AuditEventsDao');

            await createAuditEvent({
                eventId: 'patient_scanned',
                patientId,
                performingUserEmail: user2.email,
                performingUserTitle: user2.title,
                tenantId: user2.tenantId,
                userType: user2.role,
                userDisplayName: `${user2.lastName}, ${user2.firstName}`,
                deviceId: deviceInfo2.deviceId,
                deviceModel: deviceInfo2.deviceModel,
                osVersion: deviceInfo2.osVersion,
                version: '1.4.0',
                buildNumber: 908,
                locationId: 1
            });
            const result = await findTestAuditEventByDeviceId(pool, deviceInfo2.deviceId);

            expect(result.rows[0].event_id).toBe('patient_scanned');
            expect(result.rows[0].patient_id).toBe(patientId);
            expect(result.rows[0].performing_user_id).toBe(`${user2.email}`);
            expect(result.rows[0].performing_user_title).toBe(`${user2.title}`);
            expect(result.rows[0].performing_user_type).toBe(`${user2.role}`);
            expect(result.rows[0].performing_user_display_name).toBe(
                `${user2.lastName}, ${user2.firstName}`
            );
            expect(result.rows[0].device_model).toBe(`${deviceInfo2.deviceModel}`);
            expect(result.rows[0].os_version).toBe(`${deviceInfo2.osVersion}`);
            expect(result.rows[0].app_version).toBe(`1.4.0, 908`);
            expect(result.rows[0].location_id).toBe(1);
        });
    });

    describe('When deleting audit events ', () => {
        it('Then check the number of rows deleted', async () => {
            const {createAuditEvent, deleteTenantAuditEvents} = require('./AuditEventsDao');

            await createAuditEvent({
                eventId: 'patient_scanned',
                patientId,
                performingUserEmail: user2.email,
                performingUserTitle: user2.title,
                deviceId: deviceInfo2.deviceId,
                deviceModel: deviceInfo2.deviceModel,
                osVersion: deviceInfo2.osVersion,
                appVersion: deviceInfo2.appVersion,
                tenantId: user2.tenantId,
                userType: user2.role,
                userDisplayName: `${user2.lastName}, ${user2.firstName}`
            });
            await createAuditEvent({
                eventId: 'family_enrolled',
                patientId,
                performingUserEmail: user2.email,
                performingUserTitle: user2.title,
                deviceId: deviceInfo2.deviceId,
                deviceModel: deviceInfo2.deviceModel,
                osVersion: deviceInfo2.osVersion,
                appVersion: deviceInfo2.appVersion,
                tenantId: user2.tenantId,
                userType: user2.role,
                userDisplayName: `${user2.lastName}, ${user2.firstName}`
            });
            await endTestEncounter(pool, patientId);
            const result = await deleteTenantAuditEvents(
                {
                    tenantId: user2.tenantId,
                    deleteUntil: new Date()
                },
                pool
            );

            expect(result.rowCount).toBe(2);
        });
    });

    describe('When we want to retrieve audit events ', () => {
        it('Then the correct values should be returned', async () => {
            const {createAuditEvent, selectAuditReportData} = require('./AuditEventsDao');

            await createAuditEvent({
                eventId: 'patient_scanned',
                patientId,
                performingUserEmail: user2.email,
                performingUserTitle: user2.title,
                deviceId: deviceInfo2.deviceId,
                deviceModel: deviceInfo2.deviceModel,
                osVersion: deviceInfo2.osVersion,
                appVersion: deviceInfo2.appVersion,
                tenantId: user2.tenantId,
                userType: user2.role,
                userDisplayName: `${user2.lastName}, ${user2.firstName}`
            });
            await createAuditEvent({
                eventId: 'family_enrolled',
                patientId,
                performingUserEmail: user2.email,
                performingUserTitle: user2.title,
                deviceId: deviceInfo2.deviceId,
                deviceModel: deviceInfo2.deviceModel,
                osVersion: deviceInfo2.osVersion,
                appVersion: deviceInfo2.appVersion,
                tenantId: user2.tenantId,
                userType: user2.role,
                userDisplayName: `${user2.lastName}, ${user2.firstName}`
            });
            await endTestEncounter(pool, patientId);
            const result = await selectAuditReportData(
                {
                    tenantId: user2.tenantId,
                    startDate: new Date('2024-01-01T00:00:00.000Z'),
                    endDate: new Date('2024-01-02T00:00:00.000Z')
                },
                pool
            );

            expect(result.templates.length).toBe(2);
        });
    });

    describe('When we want to retrieve chat audit events ', () => {
        describe('When user role is a Caregiver', () => {
            it('Then the correct values should be returned', async () => {
                const {createAuditEvent, selectAuditReportData} = require('./AuditEventsDao');
                await createAuditEvent({
                    eventId: 'message_read',
                    patientId,
                    performingUserEmail: null,
                    performingUserTitle: user3.title,
                    deviceId: deviceInfo2.deviceId,
                    deviceModel: deviceInfo2.deviceModel,
                    osVersion: deviceInfo2.osVersion,
                    version: '1.9.0',
                    buildNumber: '1111',
                    tenantId: user3.tenantId,
                    messageContent: 'Test Message',
                    userType: user3.role,
                    locationId: user3.locationId,
                    externalId: user3.externalId,
                    userDisplayName: `${user3.lastName}, ${user3.firstName}`
                });

                await createAuditEvent({
                    eventId: 'message_sent',
                    patientId,
                    performingUserEmail: null,
                    performingUserTitle: user3.title,
                    deviceId: deviceInfo2.deviceId,
                    deviceModel: deviceInfo2.deviceModel,
                    osVersion: deviceInfo2.osVersion,
                    version: '1.9.0',
                    buildNumber: '1111',
                    tenantId: user3.tenantId,
                    messageContent: 'Test Message',
                    userType: user3.role,
                    locationId: user3.locationId,
                    externalId: user3.externalId,
                    userDisplayName: `${user3.lastName}, ${user3.firstName}`
                });

                await endTestEncounter(pool, patientId);
                const result = await selectAuditReportData(
                    {
                        tenantId: user3.tenantId,
                        startDate: new Date('2024-01-01T00:00:00.000Z'),
                        endDate: new Date('2024-01-02T00:00:00.000Z')
                    },
                    pool
                );

                expect(result.templates.length).toBe(2);
                expect(result.templates[0].messageContent).toBeTruthy();
                expect(result.templates[1].messageContent).toBeTruthy();
                expect(result.templates.find((t) => t.eventId === 'message_sent')).toBeDefined();
                expect(result.templates.find((t) => t.eventId === 'message_read')).toBeDefined();
            });
        });

        describe('When user role is a Family Member', () => {
            it('Then the correct values should be returned', async () => {
                const {createAuditEvent, selectAuditReportData} = require('./AuditEventsDao');
                await createAuditEvent({
                    eventId: 'message_read',
                    patientId,
                    performingUserEmail: null,
                    performingUserTitle: user2.title,
                    deviceId: deviceInfo2.deviceId,
                    deviceModel: deviceInfo2.deviceModel,
                    osVersion: deviceInfo2.osVersion,
                    version: '1.9.0',
                    buildNumber: '1111',
                    tenantId: user2.tenantId,
                    messageContent: 'Test Message',
                    userType: user2.role,
                    locationId: user2.locationId,
                    externalId: user2.externalId,
                    userDisplayName: `${user2.lastName}, ${user2.firstName}`,
                    familyRelation: 'Parent',
                    familyDisplayName: `${user2.lastName}, ${user2.firstName}`,
                    familyLanguage: 'Chinese Traditional',
                    familyMemberType: 'Primary',
                    familyContactNumber: '1-387-233-0531 x9326'
                });

                await createAuditEvent({
                    eventId: 'message_sent',
                    patientId,
                    performingUserEmail: null,
                    performingUserTitle: user2.title,
                    deviceId: deviceInfo2.deviceId,
                    deviceModel: deviceInfo2.deviceModel,
                    osVersion: deviceInfo2.osVersion,
                    version: '1.9.0',
                    buildNumber: '1111',
                    tenantId: user2.tenantId,
                    messageContent: 'Test Message',
                    userType: user2.role,
                    locationId: user2.locationId,
                    externalId: user2.externalId,
                    userDisplayName: `${user2.lastName}, ${user2.firstName}`,
                    familyRelation: 'Parent',
                    familyDisplayName: `${user2.lastName}, ${user2.firstName}`,
                    familyLanguage: 'Chinese Traditional',
                    familyMemberType: 'Primary',
                    familyContactNumber: '1-387-233-0531 x9326'
                });

                await endTestEncounter(pool, patientId);
                const result = await selectAuditReportData(
                    {
                        tenantId: user2.tenantId,
                        startDate: new Date('2024-01-01T00:00:00.000Z'),
                        endDate: new Date('2024-01-02T00:00:00.000Z')
                    },
                    pool
                );
                const hasFamilyDefined1 = result.templates[0].familyDisplayName.includes(
                    `${user2.lastName}, ${user2.firstName}`
                );
                const hasFamilyDefined2 = result.templates[1].familyDisplayName.includes(
                    `${user2.lastName}, ${user2.firstName}`
                );
                expect(result.templates.length).toBe(2);
                expect(result.templates[0].messageContent).toBeTruthy();
                expect(result.templates[1].messageContent).toBeTruthy();
                expect(hasFamilyDefined1).toBe(true);
                expect(hasFamilyDefined2).toBe(true);
                expect(result.templates.find((t) => t.eventId === 'message_sent')).toBeDefined();
                expect(result.templates.find((t) => t.eventId === 'message_read')).toBeDefined();
            });
        });
    });
});
