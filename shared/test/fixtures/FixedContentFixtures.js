const locationFixedContentFixtures = {
    locationFixedContent1: {
        title: 'Google',
        url: 'https://www.google.com',
        color: 'red'
    },
    locationFixedContent2: {
        title: 'Yahoo',
        url: 'https://www.yahoo.com',
        color: 'blue'
    }
};

function insertTestLocationFixedContent(database, locationFixedContent) {
    const {
        locationId,
        fixedContent: {title, url, color},
        tenantId
    } = locationFixedContent;
    const parameters = [locationId, title, url, color, 1, tenantId];
    return database.query(
        `INSERT INTO location_fixed_contents (location_id, title, url, color, content_order, tenant_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;`,
        parameters
    );
}

function getTestLocationFixedContentByLocationId(database, locationId) {
    return database.query(
        `SELECT id, tenant_id FROM location_fixed_contents WHERE location_id = $1;`,
        [locationId]
    );
}

module.exports = {
    locationFixedContentFixtures,
    insertTestLocationFixedContent,
    getTestLocationFixedContentByLocationId
};
