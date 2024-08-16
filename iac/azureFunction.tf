locals {
  AzureWebJobsStorage            = "DefaultEndpointsProtocol=https;AccountName=${azurerm_storage_account.storageaccohana.name};AccountKey=${azurerm_storage_account.storageaccohana.primary_access_key};EndpointSuffix=core.windows.net"
  PG_CONNECTION_STRING           = "postgres://ohana_user:${local.function_secrets.PG-USER-PASSWORD}@${azurerm_postgresql_flexible_server.postgres-ohana.fqdn}:5432/ohana?ssl=true"
  PG_REPORTING_CONNECTION_STRING = "postgres://ohana_user_reporting:${local.function_secrets.PG-REPORTING-PASSWORD}@${azurerm_postgresql_flexible_server.postgres-ohana.fqdn}:5432/ohana?ssl=true"
  REDIS_CONNECTION_STRING        = "rediss://:${azurerm_redis_cache.redis-ohana.primary_access_key}@${azurerm_redis_cache.redis-ohana.hostname}:${azurerm_redis_cache.redis-ohana.ssl_port}"
  appSettings                    = {
    AzureWebJobsDisableHomepage     = "true"
    AZURE_STORAGE_CONNECTION_STRING = local.AzureWebJobsStorage
    NODE_ENV                        = contains([
      "LOCAL", "DEV", "TEST", "AUT", "HOTFIX", "FEATURE"
    ], upper(local.var.OHANA.ENVIRONMENT)) ? "development" : "production"
    BAXTER_ENV = contains([
      "DEV"
    ], upper(local.var.OHANA.ENVIRONMENT)) ? "development" : lower(local.var.OHANA.ENVIRONMENT)
    FAMILY_APP_NAME                                                     = "Voalte Family"
    CHALLENGE_LENGTH                                                    = "20"
    BRANCH_IO_KEY                                                       = local.function_secrets.BRANCH-IO-KEY
    BRANCH_IO_URL                                                       = "https://api.branch.io/v1/"
    DEFAULT_POOL_ACQUIRE_TIMEOUT_IN_MILLIS                              = "15000"
    EXTERNAL_ID_TYPES                                                   = "[{\"key\": \"MR\", \"value\": \"Medical Record Number (MRN)\"}, {\"key\": \"VN\", \"value\": \"Visit Number\"}, {\"key\": \"PI\", \"value\": \"Patient Identifier\"}, {\"key\": \"AN\", \"value\": \"Account Number\"}]"
    FOSS_URL                                                            = "www.hillrom.com/opensource"
    HOSTNAME                                                            = local.OHANAURL
    NOTIFICATION_ENCRYPTION_ALGORITHM                                   = "aes-256-cbc"
    NOTIFICATION_HASHING_ALGORITHM                                      = "sha256"
    NOTIFICATION_IV_SIZE                                                = "16"
    NOTIFICATION_BYTE_SIZE                                              = "16"
    NOTIFICATION_HUB_CONNECTION_STRING                                  = "Endpoint=sb://${azurerm_notification_hub_namespace.ohana-notification-hub-namespace.name}.servicebus.windows.net/;SharedAccessKeyName=${azurerm_notification_hub_authorization_rule.rule.name};SharedAccessKey=${azurerm_notification_hub_authorization_rule.rule.primary_access_key}"
    NOTIFICATION_HUB_NAME                                               = azurerm_notification_hub.ohana-notification-hub.name
    PG_CONNECTION_STRING                                                = local.PG_CONNECTION_STRING
    PG_REPORTING_CONNECTION_STRING                                      = local.PG_REPORTING_CONNECTION_STRING
    PG_CONNECTION_TIMEOUT_IN_MILLIS                                     = "5000"
    PG_DEFAULT_MAX_POOL_SIZE                                            = "10"
    PG_DEFAULT_MIN_POOL_SIZE                                            = "5"
    REDIS_CONNECTION_STRING                                             = local.REDIS_CONNECTION_STRING
    REDIS_DEFAULT_MAX_POOL_SIZE                                         = "10"
    REDIS_DEFAULT_MIN_POOL_SIZE                                         = "0"
    SCM_DO_BUILD_DURING_DEPLOYMENT                                      = "false"
    SERVICE_BUS_SMS_QUEUE_NAME                                          = azurerm_servicebus_queue.servicebussms.name
    SERVICE_BUS_AUDIT_QUEUE_NAME                                        = azurerm_servicebus_queue.servicebusaudit.name
    ServiceBusConnection                                                = azurerm_servicebus_namespace.service-bus-ohana.default_primary_connection_string
    TWILIO_ACCOUNT_SID                                                  = local.var.OHANA.TWILIO_ACCOUNT_SID
    TWILIO_AUTH_TOKEN                                                   = local.function_secrets.TWILIO-AUTH-TOKEN
    TWILIO_PHONE_NUMBER                                                 = local.var.OHANA.TWILIO_PHONE_NUMBER
    ZENITH_B2C_BASE_INSTANCE_URL                                        = "https://hillromdigitalhealth.b2clogin.com/hillromdigitalhealth.onmicrosoft.com/discovery/v2.0/keys?p=B2C_1A_DHP${local.DHP_INTEGRATION_ENV}USVFSIGNIN"
    FAMILY_APP_NAME                                                     = "Voalte Family"
    CHALLENGE_LENGTH                                                    = "20"
    MAX_QUICK_MESSAGES                                                  = "25"
    AUDIT_RETENTION_IN_DAYS_MIN                                         = "0"
    AUDIT_RETENTION_IN_DAYS_MAX                                         = "365"
    AUDIT_RETENTION_PERIOD_IN_DAYS_DEFAULT                              = "90"
    PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_MIN                       = "1"
    PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_MAX                       = "720"
    PATIENT_AUTO_UNENROLLMENT_PERIOD_IN_HOURS_DEFAULT                   = "72"
    CAREGIVER_SESSION_INACTIVITY_IN_HOURS_DEFAULT                       = "12"
    CAREGIVER_SESSION_INACTIVITY_IN_HOURS_MAX                           = "24"
    CAREGIVER_SESSION_INACTIVITY_IN_HOURS_MIN                           = "1"
    FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_DEFAULT                 = "5"
    FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_MIN                     = "5"
    FAMILY_MEMBER_SESSION_INACTIVITY_IN_MINUTES_MAX                     = "60"
    AZURE_MEDIA_CONTAINER_NAME                                          = "media"
    AZURE_AUDIT_CONTAINER_NAME                                          = "audit"
    AZURE_STORAGE_ACCOUNT_NAME                                          = azurerm_storage_account.storageaccohana.name
    AZURE_STORAGE_ACCOUNT_KEY                                           = azurerm_storage_account.storageaccohana.primary_access_key
    ATTACHMENTS_BASE_URL                                                = "https://${local.OHANAURL}/attachment/"
    THUMBNAIL_HEIGHT                                                    = "400"
    TEMPORARY_TOKEN_TTL_IN_SECS                                         = "1800"
    MAX_LOCALIZED_QUICK_MESSAGES                                        = "26"
    MAX_SITE_WIDE_QUICK_MESSAGES                                        = "25"
    APNS_EXPIRY_IN_SECS                                                 = "21600"
    ALLOW_SECONDARY_FAMILY_MEMBERS                                      = "true"
    CHAT_LOCATION_ENABLED_DEFAULT                                       = "false"
    LOCALES                                                             = local.var.OHANA.LOCALES
    LOGGING_BUFFER_MIN_LENGTH_IN_BYTES                                  = 65536
    DEFAULT_LOG_LEVEL                                                   = local.var.OHANA.LOG_LEVEL
    # if the environmet is "external" the DISABLE_CSA_INTEGRATION variable will not be created otherwise it will have value that is set in "VLT-OhanaServer-AppConfig" in Azure
    DISABLE_CSA_INTEGRATION                                             = local.var.INFRASTRUCTURE.IS_EXTERNAL ? null : local.var.OHANA.DISABLE_CSA_INTEGRATION
    RABBITMQ_RESOURCE_MANAGEMENT_URL                                    = "https://${local.rabbitmq-fqdn}:15671/api"
    RABBITMQ_RESOURCE_MANAGEMENT_USER                                   = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault.ohana-gen-kv.vault_uri}secrets/rabbitmq-federation-admin-username/)"
    RABBITMQ_RESOURCE_MANAGEMENT_PASS                                   = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault.ohana-gen-kv.vault_uri}secrets/rabbitmq-federation-admin-password/)"
    RABBITMQ_CONNECTION_STRING_CONSUMER                                 = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault.ohana-gen-kv.vault_uri}secrets/rabbitmq-connection-string-r/)"
    RABBITMQ_CONNECTION_STRING_INFRA                                    = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault.ohana-gen-kv.vault_uri}secrets/rabbitmq-connection-string-cwr/)"
    CSA_SUPERGRAPH_URL                                                  = "https://${lower(local.var.INFRASTRUCTURE.ENVIRONMENT)}-us-appgw.${lower(local.var.INFRASTRUCTURE.DNSSUFFIX)}/graphql"
    CSA_CLIENT_ID                                                       = "ohana:ohana_${lower(local.var.INFRASTRUCTURE.ENVIRONMENT)}"
    CSA_PRODUCT_OID                                                     = "1.3.6.1.4.1.50624.1.2.6"
    CSA_RABBITMQ_FQDN                                                   = "${lower(local.var.INFRASTRUCTURE.ENVIRONMENT)}-us-amqp.${lower(local.var.INFRASTRUCTURE.DNSSUFFIX)}:5671"
    APP_CONFIG_CONNECTION_STRING                                        = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault.ohana-gen-kv.vault_uri}secrets/tenant-keystore-connection-string/)"
    RABBITMQ_POLICY_PREFIX                                              = "p-csa-"
    RABBITMQ_FEDERATION_UPSTREAM_PREFIX                                 = "fu-csa-"
    RABBITMQ_EXCHANGE_PREFIX                                            = "from-csa-"
    "AzureWebJobs.autoUnenrollPatientScheduledFunction.Disabled"        = local.var.INFRASTRUCTURE.ENVIRONMENT == "HFX" ? "true" : "false"
    "AzureWebJobs.cleanupCaregiverAssociatesScheduledFunction.Disabled" = local.var.INFRASTRUCTURE.ENVIRONMENT == "HFX" ? "true" : "false"
    "WEBSITES_CONTAINER_START_TIME_LIMIT"                               = 500
    HTTP_MIN_POOL_SIZE                                                  = "5"
    HTTP_MAX_POOL_SIZE                                                  = "10"
    WEB_PUBSUB_CONNECTION_STRING                                        = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault.ohana-gen-kv.vault_uri}secrets/pubsub-connection-string/)"
    WEB_PUBSUB_HUB_NAME                                                 = azurerm_web_pubsub_hub.hub.name
    WEB_PUBSUB_URL                                                      = "https://pubsub-${local.NAME_PATTERN}.webpubsub.azure.com"
    WEB_PUBSUB_PONG_TIMEOUT_IN_MILLIS                                   = "6000"
    WEB_PUBSUB_PING_INTERVAL_IN_MILLIS                                  = "12000"
    WEBSOCKET_INIT_TIMEOUT_IN_MILLIS                                    = "3000"
    WEB_PUBSUB_TOKEN_VALIDITY_IN_MINS                                   = "60"
  }
  azureFunctionsSettings = {
    FUNCTIONS_WORKER_PROCESS_COUNT               = "1"
    CLEANUP_CAREGIVER_ASSOCIATIONS_CRON_SCHEDULE = "*/5 * * * *"
    CLEANUP_ATTACHMENTS_CRON_SCHEDULE            = local.var.OHANA.ENVIRONMENT == "DEV" ? "*/10 * * * *" : "0 */1 * * *"
    UNENROLL_PATIENT_CRON_SCHEDULE               = contains([
      "DEV", "AUT"
    ], local.var.INFRASTRUCTURE.ENVIRONMENT) ? "*/1 * * * *" : "0 */1 * * *"
    CLEANUP_AUDIT_EVENTS_CRON_SCHEDULE      = local.var.INFRASTRUCTURE.ENVIRONMENT == "DEV" ? "*/5 * * * *" : local.var.INFRASTRUCTURE.ENVIRONMENT == "AUT" ? "*/2 * * * *" : "0 */24 * * *"
    CLEANUP_AUDIT_ATTACHMENTS_CRON_SCHEDULE = local.var.OHANA.ENVIRONMENT == "DEV" ? "*/5 * * * *" : "0 */24 * * *"
  }
}

locals {
  function_secrets = jsondecode(data.azurerm_key_vault_secret.Function_Secret.value)
}

data "azurerm_key_vault_secret" "Function_Secret" {
  name         = "${local.key_vault_secret_env_prefix}-AZURE-FUNCTION"
  key_vault_id = data.azurerm_key_vault.core-kv.id
}


resource "azurerm_service_plan" "app-service-plan-ohana" {
  name                = "app-service-plan-${local.NAME_PATTERN}"
  resource_group_name = data.azurerm_resource_group.rg.name
  location            = data.azurerm_resource_group.rg.location
  os_type             = "Linux"
  sku_name            = local.var.OHANA.FUNCTION_SKU
  tags                = local.tags
}

resource "azurerm_linux_function_app" "ohana-function-app" {
  name                            = "azure-function-${local.NAME_PATTERN}"
  location                        = azurerm_service_plan.app-service-plan-ohana.location
  resource_group_name             = azurerm_service_plan.app-service-plan-ohana.resource_group_name
  service_plan_id                 = azurerm_service_plan.app-service-plan-ohana.id
  storage_account_name            = azurerm_storage_account.storageaccohana.name
  storage_account_access_key      = azurerm_storage_account.storageaccohana.primary_access_key
  functions_extension_version     = "~4"
  tags                            = local.tags
  key_vault_reference_identity_id = data.azurerm_user_assigned_identity.ohana.id

  identity {
    type         = "UserAssigned"
    identity_ids = [data.azurerm_user_assigned_identity.ohana.id]

  }
  site_config {
    http2_enabled           = false
    ftps_state              = "AllAllowed"
    scm_minimum_tls_version = "1.2"
    cors {
      allowed_origins = [
        "*"
      ]
      support_credentials = false
    }
    application_stack {
      node_version = "18"
    }
  }
  lifecycle {
    ignore_changes = [
      app_settings["WEBSITE_ENABLE_SYNC_UPDATE_SITE"]
    ]
  }
  app_settings            = merge(local.azureFunctionsSettings, local.appSettings)
  client_certificate_mode = "Required"
  builtin_logging_enabled = false
  depends_on              = [
    azurerm_service_plan.app-service-plan-ohana,
    azurerm_servicebus_queue.servicebussms,
    azurerm_servicebus_queue.servicebusaudit,
    azurerm_storage_account.storageaccohana
  ]
}
