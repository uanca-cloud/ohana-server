//replace $blessing_tenant_id with the right tenant;
module.exports = {
    up: () => {
        return `
        BEGIN;
        UPDATE patients
        SET external_id_type = 'Visit Number'
        WHERE tenant_id = '$blessing_tenant_id';
        UPDATE tenant_settings
        SET value = 'Visit Number'
        WHERE tenant_id = '$blessing_tenant_id' AND key = 'externalIdType';
        COMMIT;
        `;
    },
    down: () => {
        return `
        -- INSERT SQL IN REVERSE ORDER HERE
        BEGIN;
        UPDATE patients
        SET external_id_type = 'MRN'
        WHERE tenant_id = '$blessing_tenant_id';
        UPDATE tenant_settings
        SET value = 'MRN'
        WHERE tenant_id = '$blessing_tenant_id' AND key = 'externalIdType';
        COMMIT;
        `;
    }
};
