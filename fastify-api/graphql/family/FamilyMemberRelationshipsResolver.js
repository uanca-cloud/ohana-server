const {
    CONSTANTS: {FAMILY_RELATIONS, FAMILY_RELATION_WITH_PATIENT},
    getLogger
} = require('ohana-shared');

const logger = getLogger('FamilyRelationshipsResolver');

async function FamilyRelationshipsResolver(_parent, _args, _ctx) {
    const familyRelations = [FAMILY_RELATION_WITH_PATIENT, ...FAMILY_RELATIONS];
    if (!familyRelations.length) {
        logger.warn('Patient relationships list is empty');
    }

    return familyRelations;
}

module.exports = FamilyRelationshipsResolver;
