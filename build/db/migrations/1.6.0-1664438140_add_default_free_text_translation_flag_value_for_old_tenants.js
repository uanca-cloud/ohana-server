module.exports = {
    up: () => {
        return `
           INSERT INTO tenant_settings (tenant_id, key, value) 
            (SELECT distinct(tenant_id), 'enableFreeTextTranslation' , true FROM tenant_settings);
        `;
    },
    down: () => {
        return `
            DELETE FROM tenant_settings WHERE key = 'enableFreeTextTranslation';
        `;
    }
};
