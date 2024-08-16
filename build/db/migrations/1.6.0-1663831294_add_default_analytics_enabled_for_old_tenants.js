module.exports = {
    up: () => {
        return `
           INSERT INTO tenant_settings (tenant_id, key, value) 
            (SELECT distinct(tenant_id), 'enableAnalytics' , true FROM tenant_settings);
        `;
    },
    down: () => {
        return `
            DELETE FROM tenant_settings WHERE key = 'enableAnalytics';
        `;
    }
};
