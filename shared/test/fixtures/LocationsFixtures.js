const locationsFixtures = {
    location1: {
        label: 'ICU',
        tenantId: 1
    },
    location2: {
        label: 'RMN',
        tenantId: 1
    },
    location3: {
        label: 'Hospital Building 1',
        tenantId: 1
    }
};

function insertTestLocation(database, location) {
    const parameters = [location.label, location.tenantId];
    return database.query(
        `INSERT INTO locations (label, tenant_id) VALUES ($1, $2) RETURNING id;`,
        parameters
    );
}

function getTestLocationById(database, locationId) {
    return database.query(`SELECT label, tenant_id FROM locations WHERE id = $1;`, [locationId]);
}

module.exports = {locationsFixtures, getTestLocationById, insertTestLocation};
