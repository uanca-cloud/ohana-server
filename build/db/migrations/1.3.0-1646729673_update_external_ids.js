module.exports = {
    up: () => {
        return `
        BEGIN;
        UPDATE patients 
        SET external_id_type = 'VN'
        WHERE external_id_type = 'Visit Number';
        UPDATE tenant_settings
        SET value = 'VN'
        WHERE value = 'Visit Number' AND key = 'externalIdType';
        UPDATE patients 
        SET external_id_type = 'MR'
        WHERE external_id_type = 'MRN';
        UPDATE tenant_settings
        SET value = 'MR'
        WHERE value = 'MRN' AND key = 'externalIdType';
        COMMIT; 
        `;
    },
    down: () => {
        return `        
        BEGIN;
        UPDATE patients 
        SET external_id_type = 'Visit Number'
        WHERE external_id_type = 'VN';
        UPDATE tenant_settings
        SET value = 'Visit Number'
        WHERE value = 'VN' AND key = 'externalIdType';
        UPDATE patients 
        SET external_id_type = 'MRN'
        WHERE external_id_type = 'MR';
        UPDATE tenant_settings
        SET value = 'MRN'
        WHERE value = 'MR' AND key = 'externalIdType';
        COMMIT; 
        `;
    }
};
