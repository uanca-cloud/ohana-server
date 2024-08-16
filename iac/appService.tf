locals {
  OHANAURL           = "${lower(local.var.INFRASTRUCTURE.ENVIRONMENT)}-${lower(local.var.INFRASTRUCTURE.AZUREREGIONSHORT)}.${local.var.OHANA.DNSSUFFIX}"
  appServiceSettings = {
    WEBSITES_PORT                              = "7071"
    FAMILY_RELATIONS                           = "[\"Parent\", \"Sibling\", \"Spouse\", \"Child\", \"Friend\", \"Other\"]"
    ZENITH_QUALIFIED_DOMAIN_NAME               = "https://${local.var.OHANA.DHPCATALOGURL}"
    ZENITH_CAREGIVER_SITE_CODE_CHECK           = "Catalog/CatalogService/api/v1.0/Tenant/Identifier"
    OUTBOUND_CALL_FORMAT_DEFAULT               = "tel://$${phoneNumber}"
    SESSION_REDIS_COLLECTION_TTL_IN_SECS       = "3600"
    USERS_REDIS_COLLECTION_TTL_IN_SECS         = "3600"
    FAMILY_INVITES_COLLECTION_TTL_IN_SECS      = local.var.INFRASTRUCTURE.ENVIRONMENT == "AUT" ? "120" : "600"
    LOGIN_CHALLENGES_COLLECTION_TTL_IN_SECS    = "600"
    REGISTER_CHALLENGES_COLLECTION_TTL_IN_SECS = "600"
    SESSION_REFRESH_TTL_IN_SECS                = "1800"
    DISABLE_ZENITH_VERIFICATION                = contains([
      "HFX"
    ], local.var.INFRASTRUCTURE.ENVIRONMENT) ? "true" : "false"
    DISABLE_BRANCHIO_INTEGRATION    = local.IS_AUTOMATED_TESTING_ENV
    ENABLE_STATIC_FM_AUTH_CHALLENGE = local.IS_AUTOMATED_TESTING_ENV
    DISABLE_RATE_LIMITING           = local.IS_AUTOMATED_TESTING_ENV
    TRANSLATION_RATE_LIMIT          = "25"
    GENERATE_SMS_RATE_LIMIT         = "15"
    RATE_LIMIT_EXPIRATION_IN_SEC    = "60"
    SERVER_ENDPOINT_URL             = "https://${local.OHANAURL}"
    B2C_CLIENT_ID                   = local.var.OHANA.B2C_CLIENT_ID
    OAUTH_LOGIN_URL                 = "https://hillromdigitalhealth.b2clogin.com/hillromdigitalhealth.onmicrosoft.com/oauth2/v2.0/authorize"
    OAUTH_SCOPED_BASE_URL           = "https://hillromdigitalhealth.onmicrosoft.com/dhp-${local.DHP_INTEGRATION_ENV}-${local.var.INFRASTRUCTURE.AZUREREGIONSHORT}-b2c-client"
    OAUTH_REDIRECT_URL              = contains([
      "AUT"
    ], local.var.INFRASTRUCTURE.ENVIRONMENT) ? "https://test-eus.vf.hrdev.io/x-callback-url/login" : "https://${local.OHANAURL}/x-callback-url/login"
    OAUTH_P_VALUE                   = "B2C_1A_DHP${local.DHP_INTEGRATION_ENV}USVFSIGNIN"
    GOOGLE_PLAY_STORE_URL           = "market://details?id=com.voalte.ohana"
    APP_STORE_URL                   = "itms-apps://apps.apple.com/us/app/voalte-family/id1548029657"
    DHP_URLS                        = contains([
      "AUT"
    ], local.var.INFRASTRUCTURE.ENVIRONMENT) ? "[\"ohana-tools.azurewebsites.net\"]" : "@Microsoft.KeyVault(SecretUri=https://dhp-all-crossplatform-kv.vault.azure.net/secrets/dhp-${local.var.INFRASTRUCTURE.ENVIRONMENT}-${local.var.INFRASTRUCTURE.AZUREREGIONSHORT}-baseurls)"
    DOCKER_REGISTRY_SERVER_PASSWORD = "@Microsoft.KeyVault(SecretUri=${data.azurerm_key_vault.regional-kv.vault_uri}secrets/acr-admin-password/)"
    DOCKER_REGISTRY_SERVER_URL      = "@Microsoft.KeyVault(SecretUri=${data.azurerm_key_vault.regional-kv.vault_uri}secrets/acr-login-server/)"
    DOCKER_REGISTRY_SERVER_USERNAME = "@Microsoft.KeyVault(SecretUri=${data.azurerm_key_vault.regional-kv.vault_uri}secrets/acr-admin-username/)"
    VIBRATION_FREQUENCY             = "300"
    SOUND_NAME                      = "default"
    SOUND_ENABLED                   = "true"
    ZENITH_PATIENT_CHECK            = "Patient/PatientService/api/v1.0"
    ZENITH_ENCOUNTER_CHECK          = "Encounter/EncounterService/api/v1.0"
    TRANSLATOR_SERVICE_LOCATION     = data.azurerm_resource_group.rg.location
    TRANSLATOR_SERVICE_KEY          = "@Microsoft.KeyVault(SecretUri=${data.azurerm_key_vault.core-kv.vault_uri}secrets/TRANSLATOR-SERVICE-KEY/)"
    MAX_FIXED_CONTENTS              = "7"
    STATIC_FM_AUTH_CHALLENGE_STRING = "b2hhbmE6b2hhbmE="
    DEFAULT_MOBILE_LOG_LEVEL        = local.var.OHANA.LOG_LEVEL_MOBILE
    DEFAULT_ADMIN_LOG_LEVEL         = local.var.OHANA.LOG_LEVEL_ADMIN
    FAMILY_RELATION_WITH_PATIENT    = "Self/Patient"
    ZENITH_LONG_TENANT_ID_CHECK     = "Catalog/CatalogService/api/v1.0/Catalog/Entity/IdentifierList"
  }
}

resource "azurerm_service_plan" "ohana-app-service-plan" {
  name                = "app-service-plan-2-${local.NAME_PATTERN}"
  resource_group_name = data.azurerm_resource_group.rg.name
  location            = data.azurerm_resource_group.rg.location
  os_type             = "Linux"
  sku_name            = local.var.OHANA.WEBAPP_SKU
  tags                = local.tags
}


resource "azurerm_monitor_autoscale_setting" "ohanascale" {
  count               = local.var.OHANA.WEBAPP_SKU != "B1" ? 1 : 0
  name                = "${azurerm_service_plan.ohana-app-service-plan.name}-scale"
  resource_group_name = azurerm_service_plan.ohana-app-service-plan.resource_group_name
  location            = azurerm_service_plan.ohana-app-service-plan.location
  target_resource_id  = azurerm_service_plan.ohana-app-service-plan.id
  tags                = local.tags

  profile {
    name = "default"
    capacity {
      #Temporarily hardcoding capacity. Will be tokenized when migrated to VLT-shared-infra
      default = local.var.OHANA.APP_SCALING_MIN
      minimum = local.var.OHANA.APP_SCALING_MIN
      maximum = local.var.OHANA.APP_SCALING_MAX
    }
    rule {
      metric_trigger {
        metric_name        = "CpuPercentage"
        metric_resource_id = azurerm_service_plan.ohana-app-service-plan.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT5M"
        time_aggregation   = "Average"
        operator           = "GreaterThan"
        threshold          = 70
      }
      scale_action {
        direction = "Increase"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT1M"
      }
    }
    rule {
      metric_trigger {
        metric_name        = "CpuPercentage"
        metric_resource_id = azurerm_service_plan.ohana-app-service-plan.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT5M"
        time_aggregation   = "Average"
        operator           = "LessThan"
        threshold          = 30
      }
      scale_action {
        direction = "Decrease"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT1M"
      }
    }
  }
}


resource "azurerm_linux_web_app" "ohana-web-app" {
  name                            = "app-service-${local.NAME_PATTERN}"
  resource_group_name             = azurerm_service_plan.ohana-app-service-plan.resource_group_name
  location                        = azurerm_service_plan.ohana-app-service-plan.location
  service_plan_id                 = azurerm_service_plan.ohana-app-service-plan.id
  key_vault_reference_identity_id = data.azurerm_user_assigned_identity.ohana.id
  https_only                      = true

  identity {
    type         = "UserAssigned"
    identity_ids = [data.azurerm_user_assigned_identity.ohana.id]

  }


  site_config {
    health_check_path       = "/health"
    http2_enabled           = false
    ftps_state              = "AllAllowed"
    scm_minimum_tls_version = "1.2"
    cors {
      allowed_origins = [
        "*"
      ]
      support_credentials = false
    }
  }
  logs {
    http_logs {
      file_system {
        retention_in_days = 0
        retention_in_mb   = 35
      }
    }
  }

  app_settings = merge(local.appServiceSettings, local.appSettings)
  tags         = local.tags
}
