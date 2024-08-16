data "azurerm_key_vault_secret" "APNS-CERT-KEY" {
  name         = "APNS-CERT-KEY"
  key_vault_id = data.azurerm_key_vault.core-kv.id
}

data "azurerm_key_vault_secret" "APNS-TOKEN-PLAINTEXT" {
  name         = "APNS-TOKEN-PLAINTEXT"
  key_vault_id = data.azurerm_key_vault.core-kv.id
}

data "azurerm_key_vault_secret" "APNS-TEAM-ID" {
  name         = "APNS-TEAM-ID"
  key_vault_id = data.azurerm_key_vault.core-kv.id
}

data "azurerm_key_vault_secret" "APNS-KEY-ID" {
  name         = "APNS-KEY-ID"
  key_vault_id = data.azurerm_key_vault.core-kv.id
}

data "azurerm_key_vault_secret" "APNS-BUNDLE-ID" {
  name         = "APNS-BUNDLE-ID"
  key_vault_id = data.azurerm_key_vault.core-kv.id
}

data "azurerm_key_vault_secret" "FCM_API_KEY" {
  name         = local.var.INFRASTRUCTURE.IS_EXTERNAL == "true" ? "FCM-API-KEY" : "INTERNAL-FCM-API-KEY"
  key_vault_id = data.azurerm_key_vault.core-kv.id
}

data "azurerm_key_vault_secret" "fcmV1-privateKey" {
  name         = local.var.INFRASTRUCTURE.IS_EXTERNAL == "true" ? "fcmV1-privateKey" : "INTERNAL-fcmV1-privateKey"
  key_vault_id = data.azurerm_key_vault.regional-kv.id
}

resource "azurerm_notification_hub_namespace" "ohana-notification-hub-namespace" {
  name                = "notification-hub-namespace-${local.NAME_PATTERN}"
  resource_group_name = data.azurerm_resource_group.rg.name
  location            = data.azurerm_resource_group.rg.location
  namespace_type      = "NotificationHub"
  sku_name            = local.var.OHANA.NOTIFICATION_HUB_SKU
  tags                = local.tags
}

resource "azurerm_notification_hub" "ohana-notification-hub" {
  name                = "notification-hub-${local.NAME_PATTERN}"
  namespace_name      = azurerm_notification_hub_namespace.ohana-notification-hub-namespace.name
  resource_group_name = data.azurerm_resource_group.rg.name
  location            = data.azurerm_resource_group.rg.location
  gcm_credential {
    api_key = data.azurerm_key_vault_secret.FCM_API_KEY.value
  }
  apns_credential {
    application_mode = contains([
      "DEV"
    ], upper(local.var.OHANA.ENVIRONMENT)) ? "Sandbox" : "Production"
    bundle_id = data.azurerm_key_vault_secret.APNS-BUNDLE-ID.value
    key_id    = data.azurerm_key_vault_secret.APNS-KEY-ID.value
    team_id   = data.azurerm_key_vault_secret.APNS-TEAM-ID.value
    token     = data.azurerm_key_vault_secret.APNS-TOKEN-PLAINTEXT.value
  }
  tags = local.tags
}

resource "azurerm_notification_hub_authorization_rule" "rule" {
  name                  = "Full"
  notification_hub_name = azurerm_notification_hub.ohana-notification-hub.name
  namespace_name        = azurerm_notification_hub_namespace.ohana-notification-hub-namespace.name
  resource_group_name   = data.azurerm_resource_group.rg.name
  manage                = true
  send                  = true
  listen                = true

  depends_on = [azurerm_notification_hub.ohana-notification-hub]

}
