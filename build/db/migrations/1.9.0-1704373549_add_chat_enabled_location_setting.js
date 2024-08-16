module.exports = {
    up: () => {
        return `
            INSERT INTO location_settings (location_id, tenant_id, key, value)
                (SELECT DISTINCT(location_id), tenant_id, 'chatLocationEnabled' , 'false' FROM location_settings);
        `;
    },
    down: () => {
        return `
            DELETE FROM location_settings WHERE key = 'chatLocationEnabled';
        `;
    }
};
