const updateTenantSetting = require('./UpdateTenantSettingSchemaValidation'),
    {
        CONSTANTS: {
            AUDIT_RETENTION_IN_DAYS_MIN,
            AUDIT_RETENTION_IN_DAYS_MAX,
            AUDIT_RETENTION_PERIOD_IN_DAYS_DEFAULT,
            CAREGIVER_SESSION_INACTIVITY_IN_HOURS_DEFAULT,
            FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_DEFAULT,
            FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_MIN,
            FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_MAX,
            CAREGIVER_SESSION_INACTIVITY_IN_HOURS_MAX,
            CAREGIVER_SESSION_INACTIVITY_IN_HOURS_MIN,
            MIN_FAMILY_MEMBER_LIMIT,
            MAX_FAMILY_MEMBER_LIMIT,
            TENANT_SETTINGS_KEYS,
            TENANT_SETTINGS_KEYS: {
                FREE_TEXT_FLAG,
                MEDIA_ATTACHMENT_FLAG,
                EXTERNAL_ID_TYPE,
                OUTBOUND_CALL_FORMAT,
                AUDIT_RETENTION,
                CAREGIVER_SESSION_INACTIVITY,
                FAMILY_MEMBER_SESSION_INACTIVITY,
                FAMILY_MEMBER_LIMIT,
                ANALYTICS_FLAG,
                FREE_TEXT_TRANSLATION_FLAG
            }
        }
    } = require('ohana-shared');

describe('Given we want to validate the Graphql schema for updating an tenant setting', () => {
    describe('when valid schema is provided', () => {
        describe(`and key type ${EXTERNAL_ID_TYPE}`, () => {
            it('then it should return the schema', async () => {
                const result = await updateTenantSetting.validateAsync({
                    input: {key: EXTERNAL_ID_TYPE, value: 'MRN'}
                });
                expect(result).toEqual(
                    expect.objectContaining({input: {key: EXTERNAL_ID_TYPE, value: 'MRN'}})
                );
            });
        });

        describe(`and key type ${OUTBOUND_CALL_FORMAT}`, () => {
            it('then it should return the schema', async () => {
                const result = await updateTenantSetting.validateAsync({
                    input: {
                        key: OUTBOUND_CALL_FORMAT,
                        value: 'voalte://x-callback-url/voice?number=${phoneNumber}'
                    }
                });
                expect(result).toEqual(
                    expect.objectContaining({
                        input: {
                            key: OUTBOUND_CALL_FORMAT,
                            value: 'voalte://x-callback-url/voice?number=${phoneNumber}'
                        }
                    })
                );
            });
        });

        describe(`and key type ${AUDIT_RETENTION}`, () => {
            it('then it should return the schema', async () => {
                const result = await updateTenantSetting.validateAsync({
                    input: {
                        key: AUDIT_RETENTION,
                        value: AUDIT_RETENTION_PERIOD_IN_DAYS_DEFAULT.toString()
                    }
                });
                expect(result).toEqual(
                    expect.objectContaining({
                        input: {
                            key: AUDIT_RETENTION,
                            value: AUDIT_RETENTION_PERIOD_IN_DAYS_DEFAULT.toString()
                        }
                    })
                );
            });
        });

        describe(`and key type ${CAREGIVER_SESSION_INACTIVITY}`, () => {
            it('then it should return the schema', async () => {
                const result = await updateTenantSetting.validateAsync({
                    input: {
                        key: CAREGIVER_SESSION_INACTIVITY,
                        value: CAREGIVER_SESSION_INACTIVITY_IN_HOURS_DEFAULT.toString()
                    }
                });
                expect(result).toEqual(
                    expect.objectContaining({
                        input: {
                            key: CAREGIVER_SESSION_INACTIVITY,
                            value: CAREGIVER_SESSION_INACTIVITY_IN_HOURS_DEFAULT.toString()
                        }
                    })
                );
            });
        });

        describe(`and key type ${FAMILY_MEMBER_SESSION_INACTIVITY}`, () => {
            it('then it should return the schema', async () => {
                const result = await updateTenantSetting.validateAsync({
                    input: {
                        key: FAMILY_MEMBER_SESSION_INACTIVITY,
                        value: FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_DEFAULT.toString()
                    }
                });
                expect(result).toEqual(
                    expect.objectContaining({
                        input: {
                            key: FAMILY_MEMBER_SESSION_INACTIVITY,
                            value: FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_DEFAULT.toString()
                        }
                    })
                );
            });
        });
    });

    describe('when invalid schema is provided', () => {
        describe('and no input is provided', () => {
            it('then it should throw', async () => {
                await updateTenantSetting
                    .validateAsync({})
                    .catch((err) => expect(err.details[0].message).toBe('"input" is required'));
            });
        });

        describe('and required args are missing', () => {
            it('then it should throw', async () => {
                await updateTenantSetting
                    .validateAsync({input: {}}, {abortEarly: false})
                    .catch((err) => {
                        expect(err.details.length).toBe(2);
                        expect(err.details[0].message).toBe('"input.key" is required');
                        expect(err.details[1].message).toBe('"input.value" is required');
                    });
            });
        });

        describe('and invalid key is provided', () => {
            it('then it should throw', async () => {
                await updateTenantSetting
                    .validateAsync({input: {key: 'invalidKey', value: 'MRN'}})
                    .catch((err) => {
                        expect(err.details[0].message).toBe(
                            `"input.key" must be one of [${Object.values(TENANT_SETTINGS_KEYS).join(
                                ', '
                            )}]`
                        );
                    });
            });
        });

        describe(`when key type ${AUDIT_RETENTION}`, () => {
            describe('and max value is provided', () => {
                it('then it should return the schema', async () => {
                    const result = await updateTenantSetting.validateAsync({
                        input: {key: AUDIT_RETENTION, value: AUDIT_RETENTION_IN_DAYS_MAX.toString()}
                    });
                    expect(result).toEqual(
                        expect.objectContaining({
                            input: {
                                key: AUDIT_RETENTION,
                                value: AUDIT_RETENTION_IN_DAYS_MAX.toString()
                            }
                        })
                    );
                });
            });

            describe('and min value is provided', () => {
                it('then it should return the schema', async () => {
                    const result = await updateTenantSetting.validateAsync({
                        input: {key: AUDIT_RETENTION, value: AUDIT_RETENTION_IN_DAYS_MIN.toString()}
                    });
                    expect(result).toEqual(
                        expect.objectContaining({
                            input: {
                                key: AUDIT_RETENTION,
                                value: AUDIT_RETENTION_IN_DAYS_MIN.toString()
                            }
                        })
                    );
                });
            });

            describe('and value greater than maximum accepted', () => {
                it('then it should throw', async () => {
                    const value = (AUDIT_RETENTION_IN_DAYS_MAX + 1).toString();
                    await updateTenantSetting
                        .validateAsync({input: {key: AUDIT_RETENTION, value}})
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                `"input.value" failed custom validation because value must be less than or equal to ${AUDIT_RETENTION_IN_DAYS_MAX}`
                            )
                        );
                });
            });

            describe('and value smaller than minimum accepted', () => {
                it('then it should throw', async () => {
                    const value = AUDIT_RETENTION_IN_DAYS_MIN.toString();
                    await updateTenantSetting
                        .validateAsync({input: {key: AUDIT_RETENTION, value}})
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                `"input.value" with value "${AUDIT_RETENTION_IN_DAYS_MIN}" fails to match the required pattern: /^(([1-9][0-9]*)|([0]+))$/`
                            )
                        );
                });
            });

            describe('and string is provided instead of number', () => {
                it('then it should throw', async () => {
                    await updateTenantSetting
                        .validateAsync({input: {key: AUDIT_RETENTION, value: 'string'}})
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                '"input.value" with value "string" fails to match the required pattern: /^(([1-9]\\d*)|(0+))$/'
                            )
                        );
                });
            });

            describe('and float number is provided instead of integer', () => {
                it('then it should throw', async () => {
                    await updateTenantSetting
                        .validateAsync({input: {key: AUDIT_RETENTION, value: '10.8'}})
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                '"input.value" with value "10.8" fails to match the required pattern: /^(([1-9]\\d*)|(0+))$/'
                            )
                        );
                });
            });

            describe('when invalid value that starts with 0 is provided', () => {
                it('then it should throw', async () => {
                    await updateTenantSetting
                        .validateAsync({
                            input: {locationId: 1, key: AUDIT_RETENTION, value: '0092'}
                        })
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                '"input.value" with value "0092" fails to match the required pattern: /^(([1-9]\\d*)|(0+))$/'
                            )
                        );
                });
            });
        });

        describe(`when key type ${CAREGIVER_SESSION_INACTIVITY}`, () => {
            describe('and max value is provided', () => {
                it('then it should return the schema', async () => {
                    const result = await updateTenantSetting.validateAsync({
                        input: {
                            key: CAREGIVER_SESSION_INACTIVITY,
                            value: CAREGIVER_SESSION_INACTIVITY_IN_HOURS_MAX.toString()
                        }
                    });
                    expect(result).toEqual(
                        expect.objectContaining({
                            input: {
                                key: CAREGIVER_SESSION_INACTIVITY,
                                value: CAREGIVER_SESSION_INACTIVITY_IN_HOURS_MAX.toString()
                            }
                        })
                    );
                });
            });

            describe('and min value is provided', () => {
                it('then it should return the schema', async () => {
                    const result = await updateTenantSetting.validateAsync({
                        input: {
                            key: CAREGIVER_SESSION_INACTIVITY,
                            value: CAREGIVER_SESSION_INACTIVITY_IN_HOURS_MIN.toString()
                        }
                    });
                    expect(result).toEqual(
                        expect.objectContaining({
                            input: {
                                key: CAREGIVER_SESSION_INACTIVITY,
                                value: CAREGIVER_SESSION_INACTIVITY_IN_HOURS_MIN.toString()
                            }
                        })
                    );
                });
            });

            describe('and value greater than maximum accepted', () => {
                it('then it should throw', async () => {
                    const value = (CAREGIVER_SESSION_INACTIVITY_IN_HOURS_MAX + 1).toString();
                    await updateTenantSetting
                        .validateAsync({input: {key: CAREGIVER_SESSION_INACTIVITY, value}})
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                `"input.value" failed custom validation because value must be less than or equal to ${CAREGIVER_SESSION_INACTIVITY_IN_HOURS_MAX}`
                            )
                        );
                });
            });

            describe('and value smaller than minimum accepted', () => {
                it('then it should throw', async () => {
                    const value = (CAREGIVER_SESSION_INACTIVITY_IN_HOURS_MIN - 1).toString();
                    await updateTenantSetting
                        .validateAsync({input: {key: CAREGIVER_SESSION_INACTIVITY, value}})
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                `"input.value" failed custom validation because value must be greater than or equal to ${CAREGIVER_SESSION_INACTIVITY_IN_HOURS_MIN}`
                            )
                        );
                });
            });

            describe('and string is provided instead of number', () => {
                it('then it should throw', async () => {
                    await updateTenantSetting
                        .validateAsync({
                            input: {key: CAREGIVER_SESSION_INACTIVITY, value: 'string'}
                        })
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                '"input.value" with value "string" fails to match the required pattern: /^(([1-9]\\d*)|(0+))$/'
                            )
                        );
                });
            });

            describe('and float number is provided instead of integer', () => {
                it('then it should throw', async () => {
                    await updateTenantSetting
                        .validateAsync({input: {key: CAREGIVER_SESSION_INACTIVITY, value: '10.8'}})
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                '"input.value" with value "10.8" fails to match the required pattern: /^(([1-9]\\d*)|(0+))$/'
                            )
                        );
                });
            });

            describe('when invalid value that starts with 0 is provided', () => {
                it('then it should throw', async () => {
                    await updateTenantSetting
                        .validateAsync({
                            input: {locationId: 1, key: CAREGIVER_SESSION_INACTIVITY, value: '0011'}
                        })
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                '"input.value" with value "0011" fails to match the required pattern: /^(([1-9]\\d*)|(0+))$/'
                            )
                        );
                });
            });
        });

        describe(`when key type ${FAMILY_MEMBER_SESSION_INACTIVITY}`, () => {
            describe('and max value is provided', () => {
                it('then it should return the schema', async () => {
                    const result = await updateTenantSetting.validateAsync({
                        input: {
                            key: FAMILY_MEMBER_SESSION_INACTIVITY,
                            value: FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_MAX.toString()
                        }
                    });
                    expect(result).toEqual(
                        expect.objectContaining({
                            input: {
                                key: FAMILY_MEMBER_SESSION_INACTIVITY,
                                value: FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_MAX.toString()
                            }
                        })
                    );
                });
            });

            describe('and min value is provided', () => {
                it('then it should return the schema', async () => {
                    const result = await updateTenantSetting.validateAsync({
                        input: {
                            key: FAMILY_MEMBER_SESSION_INACTIVITY,
                            value: FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_MIN.toString()
                        }
                    });
                    expect(result).toEqual(
                        expect.objectContaining({
                            input: {
                                key: FAMILY_MEMBER_SESSION_INACTIVITY,
                                value: FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_MIN.toString()
                            }
                        })
                    );
                });
            });

            describe('and value greater than maximum accepted', () => {
                it('then it should throw', async () => {
                    const value = (FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_MAX + 1).toString();
                    await updateTenantSetting
                        .validateAsync({input: {key: FAMILY_MEMBER_SESSION_INACTIVITY, value}})
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                `"input.value" failed custom validation because value must be less than or equal to ${FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_MAX}`
                            )
                        );
                });
            });

            describe('and value smaller than minimum accepted', () => {
                it('then it should throw', async () => {
                    const value = (FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_MIN - 1).toString();
                    await updateTenantSetting
                        .validateAsync({input: {key: FAMILY_MEMBER_SESSION_INACTIVITY, value}})
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                `"input.value" failed custom validation because value must be greater than or equal to ${FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_MIN}`
                            )
                        );
                });
            });

            describe('and string is provided instead of number', () => {
                it('then it should throw', async () => {
                    await updateTenantSetting
                        .validateAsync({
                            input: {key: FAMILY_MEMBER_SESSION_INACTIVITY, value: 'string'}
                        })
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                '"input.value" with value "string" fails to match the required pattern: /^(([1-9]\\d*)|(0+))$/'
                            )
                        );
                });
            });

            describe('and float number is provided instead of integer', () => {
                it('then it should throw', async () => {
                    await updateTenantSetting
                        .validateAsync({
                            input: {key: FAMILY_MEMBER_SESSION_INACTIVITY, value: '10.8'}
                        })
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                '"input.value" with value "10.8" fails to match the required pattern: /^(([1-9]\\d*)|(0+))$/'
                            )
                        );
                });
            });

            describe('when invalid value that starts with 0 is provided', () => {
                it('then it should throw', async () => {
                    await updateTenantSetting
                        .validateAsync({
                            input: {
                                locationId: 1,
                                key: FAMILY_MEMBER_SESSION_INACTIVITY,
                                value: '0011'
                            }
                        })
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                '"input.value" with value "0011" fails to match the required pattern: /^(([1-9]\\d*)|(0+))$/'
                            )
                        );
                });
            });
        });

        describe(`when key type ${OUTBOUND_CALL_FORMAT}`, () => {
            describe('and max value is provided', () => {
                it('then it should return the schema', async () => {
                    const result = await updateTenantSetting.validateAsync({
                        input: {key: FAMILY_MEMBER_LIMIT, value: MAX_FAMILY_MEMBER_LIMIT.toString()}
                    });
                    expect(result).toEqual(
                        expect.objectContaining({
                            input: {
                                key: FAMILY_MEMBER_LIMIT,
                                value: MAX_FAMILY_MEMBER_LIMIT.toString()
                            }
                        })
                    );
                });
            });

            describe('and min value is provided', () => {
                it('then it should return the schema', async () => {
                    const result = await updateTenantSetting.validateAsync({
                        input: {key: FAMILY_MEMBER_LIMIT, value: MIN_FAMILY_MEMBER_LIMIT.toString()}
                    });
                    expect(result).toEqual(
                        expect.objectContaining({
                            input: {
                                key: FAMILY_MEMBER_LIMIT,
                                value: MIN_FAMILY_MEMBER_LIMIT.toString()
                            }
                        })
                    );
                });
            });

            describe('and value greater than maximum accepted', () => {
                it('then it should throw', async () => {
                    const value = (MAX_FAMILY_MEMBER_LIMIT + 1).toString();
                    await updateTenantSetting
                        .validateAsync({input: {key: FAMILY_MEMBER_LIMIT, value}})
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                `"input.value" failed custom validation because value must be less than or equal to ${MAX_FAMILY_MEMBER_LIMIT}`
                            )
                        );
                });
            });

            describe('and value smaller than minimum accepted', () => {
                it('then it should throw', async () => {
                    const value = (MIN_FAMILY_MEMBER_LIMIT - 1).toString();
                    await updateTenantSetting
                        .validateAsync({input: {key: FAMILY_MEMBER_LIMIT, value}})
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                `"input.value" failed custom validation because value must be greater than or equal to ${MIN_FAMILY_MEMBER_LIMIT}`
                            )
                        );
                });
            });
        });

        describe(`when key type ${OUTBOUND_CALL_FORMAT}`, () => {
            describe('and value is empty', () => {
                it('then it should throw', async () => {
                    await updateTenantSetting
                        .validateAsync({input: {key: OUTBOUND_CALL_FORMAT, value: ''}})
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                '"input.value" is not allowed to be empty'
                            )
                        );
                });

                describe('and number is provided instead of string', () => {
                    it('then it should throw', async () => {
                        await updateTenantSetting
                            .validateAsync({input: {key: OUTBOUND_CALL_FORMAT, value: 2222}})
                            .catch((err) =>
                                expect(err.details[0].message).toBe(
                                    '"input.value" must be a string'
                                )
                            );
                    });
                });

                describe('and it does not contain ${phoneNumber}', () => {
                    it('then it should throw', async () => {
                        await updateTenantSetting
                            .validateAsync({
                                input: {
                                    key: OUTBOUND_CALL_FORMAT,
                                    value: 'invalidOutboundCallFormat'
                                }
                            })
                            .catch((err) =>
                                expect(err.details[0].message).toBe(
                                    '"input.value" with value "invalidOutboundCallFormat" fails to match the required pattern: /(\\${phoneNumber})/'
                                )
                            );
                    });
                });

                describe('and required string ${phoneNumber} is not case sensitive', () => {
                    it('then it should throw', async () => {
                        await updateTenantSetting
                            .validateAsync({
                                input: {key: OUTBOUND_CALL_FORMAT, value: '${phonenumber}'}
                            })
                            .catch((err) =>
                                expect(err.details[0].message).toBe(
                                    '"input.value" with value "${phonenumber}" fails to match the required pattern: /(\\${phoneNumber})/'
                                )
                            );
                    });
                });
            });
        });

        describe(`when key type ${EXTERNAL_ID_TYPE}`, () => {
            describe('and value is empty', () => {
                it('then it should throw', async () => {
                    await updateTenantSetting
                        .validateAsync({input: {key: EXTERNAL_ID_TYPE, value: ''}})
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                '"input.value" is not allowed to be empty'
                            )
                        );
                });
            });

            describe('and number is provided instead of string', () => {
                it('then it should throw', async () => {
                    await updateTenantSetting
                        .validateAsync({input: {key: EXTERNAL_ID_TYPE, value: 2222}})
                        .catch((err) =>
                            expect(err.details[0].message).toBe('"input.value" must be a string')
                        );
                });
            });
        });

        describe(`when key type ${FREE_TEXT_FLAG}`, () => {
            describe('and value is empty', () => {
                it('then it should throw', async () => {
                    await updateTenantSetting
                        .validateAsync({input: {key: FREE_TEXT_FLAG, value: ''}})
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                '"input.value" must be one of [true, false]'
                            )
                        );
                });
            });

            describe('and boolean is provided instead of string', () => {
                it('then it should throw', async () => {
                    await updateTenantSetting
                        .validateAsync({input: {key: FREE_TEXT_FLAG, value: true}})
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                '"input.value" must be one of [true, false]'
                            )
                        );
                });
            });

            describe('and invalid string is provided', () => {
                it('then it should throw', async () => {
                    await updateTenantSetting
                        .validateAsync({input: {key: FREE_TEXT_FLAG, value: 'njadgdgaa'}})
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                '"input.value" must be one of [true, false]'
                            )
                        );
                });
            });
        });

        describe(`when key type ${MEDIA_ATTACHMENT_FLAG}`, () => {
            describe('and value is empty', () => {
                it('then it should throw', async () => {
                    await updateTenantSetting
                        .validateAsync({input: {key: MEDIA_ATTACHMENT_FLAG, value: ''}})
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                '"input.value" must be one of [true, false]'
                            )
                        );
                });
            });

            describe('and boolean is provided instead of string', () => {
                it('then it should throw', async () => {
                    await updateTenantSetting
                        .validateAsync({input: {key: MEDIA_ATTACHMENT_FLAG, value: true}})
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                '"input.value" must be one of [true, false]'
                            )
                        );
                });
            });

            describe('and invalid string is provided', () => {
                it('then it should throw', async () => {
                    await updateTenantSetting
                        .validateAsync({input: {key: MEDIA_ATTACHMENT_FLAG, value: 'njadgdgaa'}})
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                '"input.value" must be one of [true, false]'
                            )
                        );
                });
            });
        });

        describe(`when key type ${ANALYTICS_FLAG}`, () => {
            describe('and value is empty', () => {
                it('then it should throw', async () => {
                    await updateTenantSetting
                        .validateAsync({input: {key: ANALYTICS_FLAG, value: ''}})
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                '"input.value" must be one of [true, false]'
                            )
                        );
                });
            });

            describe('and boolean is provided instead of string', () => {
                it('then it should throw', async () => {
                    await updateTenantSetting
                        .validateAsync({input: {key: ANALYTICS_FLAG, value: true}})
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                '"input.value" must be one of [true, false]'
                            )
                        );
                });
            });

            describe('and invalid string is provided', () => {
                it('then it should throw', async () => {
                    await updateTenantSetting
                        .validateAsync({input: {key: ANALYTICS_FLAG, value: 'njadgdgaa'}})
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                '"input.value" must be one of [true, false]'
                            )
                        );
                });
            });
        });

        describe(`when key type ${FREE_TEXT_TRANSLATION_FLAG}`, () => {
            describe('and value is empty', () => {
                it('then it should throw', async () => {
                    await updateTenantSetting
                        .validateAsync({input: {key: FREE_TEXT_TRANSLATION_FLAG, value: ''}})
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                '"input.value" must be one of [true, false]'
                            )
                        );
                });
            });

            describe('and boolean is provided instead of string', () => {
                it('then it should throw', async () => {
                    await updateTenantSetting
                        .validateAsync({input: {key: ANALYTICS_FLAG, value: true}})
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                '"input.value" must be one of [true, false]'
                            )
                        );
                });
            });

            describe('and invalid string is provided', () => {
                it('then it should throw', async () => {
                    await updateTenantSetting
                        .validateAsync({input: {key: ANALYTICS_FLAG, value: 'njadgdgaa'}})
                        .catch((err) =>
                            expect(err.details[0].message).toBe(
                                '"input.value" must be one of [true, false]'
                            )
                        );
                });
            });
        });
    });
});
