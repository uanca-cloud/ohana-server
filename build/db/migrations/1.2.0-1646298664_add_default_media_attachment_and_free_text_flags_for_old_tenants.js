module.exports = {
    up: () => {
        return `
        BEGIN;
        INSERT INTO tenant_settings (tenant_id, key, value) 
            (SELECT distinct(tenant_id), 'enableFreeText' , 'true' FROM tenant_settings);
        INSERT INTO tenant_settings (tenant_id, key, value) 
            (SELECT distinct(tenant_id), 'enableMediaAttachment' , 'true' FROM tenant_settings);
        COMMIT;
        `;
    },
    down: () => {
        return `
        DELETE FROM tenant_settings WHERE key IN('enableFreeText','enableMediaAttachment');
        `;
    }
};
