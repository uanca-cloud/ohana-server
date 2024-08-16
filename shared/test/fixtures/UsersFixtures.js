/**
 * @typedef {Object} userData
 * @property {string} user_id
 */
const {
    OHANA_ROLES: {ADMINISTRATOR, CAREGIVER, FAMILY_MEMBER}
} = require('../../constants');
const fixtureData = {
    user1: {
        userId: 123,
        tenantId: 1,
        role: ADMINISTRATOR,
        assignedRoles: [ADMINISTRATOR]
    },
    user2: {
        userId: 321,
        tenantId: 1,
        role: FAMILY_MEMBER,
        assignedRoles: [FAMILY_MEMBER],
        firstName: 'TestFirstname',
        lastName: 'TestLastname',
        title: 'RN',
        email: 'firstname.lastname@email.com',
        eulaAcceptTimestamp: new Date().toISOString(),
        locationId: 290,
        externalId: 'OHS-8092'
    },
    user3: {
        userId: 111,
        tenantId: 1,
        role: CAREGIVER,
        assignedRoles: [CAREGIVER],
        firstName: 'TestFirstname',
        lastName: 'TestLastname',
        title: 'RN',
        locationId: 290,
        externalId: 'OHS-8092'
    },
    user4: {
        userId: 2222,
        tenantId: 1,
        role: CAREGIVER,
        assignedRoles: [CAREGIVER],
        firstName: 'TestFirstname',
        lastName: 'TestLastname',
        title: 'RN',
        email: 'email@test.com'
    },
    user5: {
        userId: 5555,
        tenantId: 1,
        role: CAREGIVER,
        assignedRoles: [CAREGIVER],
        firstName: 'TestFirstname',
        lastName: 'TestLastname',
        title: 'RN'
    },
    user6: {
        userId: 112,
        tenantId: 1,
        role: FAMILY_MEMBER,
        assignedRoles: [FAMILY_MEMBER],
        firstName: 'TestFirstname',
        lastName: 'TestLastname',
        phoneNumber: '+1224343',
        patientRelationship: 'Uncle',
        preferredLocale: 'US'
    },
    user7: {
        userId: '4dd0a63c-ef3e-47a0-899b-87d3c7b6cb68',
        firstName: 'Debbie',
        lastName: 'Rose 0',
        title: 'IT Admin',
        role: ADMINISTRATOR,
        assignedRoles: [ADMINISTRATOR],
        jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsICJraWQiOiAiVEVTVEtJRCJ9.eyJzb3VyY2VVc2VyIjoiNGRkMGE2M2MtZWYzZS00N2EwLTg5OWItODdkM2M3YjZjYjY4IiwiZ2l2ZW5fbmFtZSI6IkRlYmJpZSIsImZhbWlseV9uYW1lIjoiUm9zZSAwIiwiaGlsbHJvbSI6IntcImpvYlRpdGxlXCI6XCJJVCBBZG1pblwiLFwic2NvcGVzXCI6e1wicm9sZXNcIjpbXCJPaGFuYSBBZG1pbmlzdHJhdG9yXCJdfX0iLCJpYXQiOjE2NjMxMzYzOTN9.1gEr_B-ryzpmoeb6ykNj6EUda3mfayKuiAPw-5--xZk'
    },
    user8: {
        tenantId: 'e9567f5d-b066-4d92-8fa3-57786df24e1b',
        userId: '05c847f6-c83f-4e8a-86eb-ee1455017984',
        firstName: 'Bob',
        lastName: 'Dobbs 0',
        title: 'Nurse',
        role: CAREGIVER,
        assignedRoles: [CAREGIVER],
        email: undefined,
        jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsICJraWQiOiAiVEVTVEtJRCJ9.eyJzb3VyY2VVc2VyIjoiMDVjODQ3ZjYtYzgzZi00ZThhLTg2ZWItZWUxNDU1MDE3OTg0IiwiZ2l2ZW5fbmFtZSI6IkJvYiIsImZhbWlseV9uYW1lIjoiRG9iYnMgMCIsImhpbGxyb20iOiJ7XCJqb2JUaXRsZVwiOlwiTnVyc2VcIixcInNjb3Blc1wiOntcInJvbGVzXCI6W1wiT2hhbmEgQ2xpZW50XCJdfX0iLCJpYXQiOjE2NjMxMzYzOTN9.rZl4wRl9jGGhkkHr5ugI0nLKjzpiKvlINX7ATmtGdTQ'
    },
    user9: {
        userId: 9999,
        tenantId: 1,
        role: CAREGIVER,
        assignedRoles: [CAREGIVER],
        firstName: 'TestFirstname',
        lastName: 'TestLastname',
        title: 'RN'
    },
    user10: {
        userId: 1010,
        tenantId: 1,
        role: FAMILY_MEMBER,
        assignedRoles: [FAMILY_MEMBER],
        firstName: 'TestFirstname',
        lastName: 'TestLastname',
        title: 'RN'
    },
    user11: {
        userId: 11,
        tenantId: 1,
        role: CAREGIVER,
        assignedRoles: [CAREGIVER],
        firstName: 'TestFirstname',
        lastName: 'TestLastname',
        title: 'RN'
    }
};

/**
 *
 * @param database - A database client instance
 * @param userData
 * @returns {Boolean}
 */
function insertTestUser(database, userData) {
    const parameters = [
        userData.userId,
        userData.tenantId,
        userData.assignedRoles,
        userData.firstName || '',
        userData.lastName || '',
        userData.title || '',
        userData.eulaAcceptTimestamp || null
    ];

    return database.query(
        `INSERT INTO users (
                    user_id,
                    tenant_id,
                    assigned_roles,
                    first_name,
                    last_name,
                    title,
                    last_eula_acceptance_timestamp
                ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING user_id;
            `,
        parameters
    );
}

/**
 *
 * @param database - A database client instance
 * @param id - user id
 * @returns {*}
 */
function selectTestUserById(database, id, getDeleted = false) {
    const parameters = [id, getDeleted];
    return database.query(
        `SELECT tenant_id, assigned_roles, title, first_name, last_name, last_eula_acceptance_timestamp, email FROM users WHERE user_id = $1 AND deleted = $2`,
        parameters
    );
}

module.exports = {
    fixtureData,
    insertTestUser,
    selectTestUserById
};
