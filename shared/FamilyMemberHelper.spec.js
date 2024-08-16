const mockOhanaShared = () => {
    jest.mock('./constants', () => ({
        FAMILY_RELATION_WITH_PATIENT: 'Self/Patient'
    }));

    jest.mock('./family/FamilyIdentityDao', () => ({
        hasPatientUserRegistered: jest.fn((patientId, userId) => {
            if (patientId === '1234' && userId === '123') {
                return Promise.resolve(true);
            }

            return Promise.resolve(false);
        })
    }));
};

afterEach(() => {
    jest.unmock('./constants');
});

describe('Given we want to check if a user is a patient', () => {
    describe('when Self/Patient relationship is passed', () => {
        test('then it should return true', async () => {
            mockOhanaShared();
            const {isPatient} = require('./FamilyMemberHelper');

            await expect(isPatient('Self/Patient')).toBe(true);
        });
    });

    describe('when a different relationship to patient is passed', () => {
        test('then it should return false', () => {
            mockOhanaShared();
            const {isPatient} = require('./FamilyMemberHelper');

            expect(isPatient('Sister')).toBe(false);
        });
    });
});

describe('Given we want to chek if a family member has the relationship set to patient and is not primary', () => {
    describe('and the relationship is Self/Patient', () => {
        describe('and family member is not primary', () => {
            test('then it should return true', () => {
                mockOhanaShared();

                const {isPatientAndNotPrimary} = require('./FamilyMemberHelper');

                expect(isPatientAndNotPrimary('Self/Patient', false)).toBe(true);
            });
        });

        describe('and family member is primary', () => {
            test('then it should return false', () => {
                mockOhanaShared();

                const {isPatientAndNotPrimary} = require('./FamilyMemberHelper');

                expect(isPatientAndNotPrimary('Self/Patient', true)).toBe(false);
            });
        });
    });

    describe('and the relationship is not Self/Patient', () => {
        describe('and family member is not primary', () => {
            test('then it should return false', () => {
                mockOhanaShared();

                const {isPatientAndNotPrimary} = require('./FamilyMemberHelper');

                expect(isPatientAndNotPrimary('Sister', false)).toBe(false);
            });
        });

        describe('and family member is primary', () => {
            test('then it should return false', () => {
                mockOhanaShared();

                const {isPatientAndNotPrimary} = require('./FamilyMemberHelper');

                expect(isPatientAndNotPrimary('Sister', true)).toBe(false);
            });
        });
    });
});

describe('Given we want to check if a patient is duplicated', () => {
    describe('and family member relationship is Self/Patient', () => {
        describe('and one patient already exists', () => {
            test('then it should return true', async () => {
                mockOhanaShared();

                const {isDuplicatePatient} = require('./FamilyMemberHelper');

                expect(await isDuplicatePatient('Self/Patient', '1234', '123')).toBe(true);
            });
        });

        describe('and no patient exists', () => {
            test('then it should return false', async () => {
                mockOhanaShared();

                const {isDuplicatePatient} = require('./FamilyMemberHelper');

                expect(await isDuplicatePatient('Self/Patient', '1', '1')).toBe(false);
            });
        });
    });

    describe('and family member relationship is not Self/Patient', () => {
        describe('and one patient already exists', () => {
            test('then it should return false', async () => {
                mockOhanaShared();

                const {isDuplicatePatient} = require('./FamilyMemberHelper');

                expect(await isDuplicatePatient('Sister', '1234', '123')).toBe(false);
            });
        });

        describe('and no patient exists', () => {
            test('then it should return false', async () => {
                mockOhanaShared();

                const {isDuplicatePatient} = require('./FamilyMemberHelper');

                expect(await isDuplicatePatient('Sister', '1', '1')).toBe(false);
            });
        });
    });
});
