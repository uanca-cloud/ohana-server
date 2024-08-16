output "appservice_name" {
  value = azurerm_linux_web_app.ohana-web-app.name
}

output "endpoint_url" {
  value = "https://${local.OHANAURL}"
}

output "functionapp_name" {
  value = azurerm_linux_function_app.ohana-function-app.name
}

output "resource_group" {
  value = data.azurerm_resource_group.rg.name
}

output "pg_name" {
  value = azurerm_postgresql_flexible_server.postgres-ohana.name
}

output "pg_username" {
  value     = azurerm_postgresql_flexible_server.postgres-ohana.administrator_login
  sensitive = true
}

output "pg_password" {
  value     = azurerm_postgresql_flexible_server.postgres-ohana.administrator_password
  sensitive = true
}

output "acr_login_server" {
  value = data.azurerm_container_registry.acr.login_server
}

output "notification_hub_sas_name" {
  value = azurerm_notification_hub_authorization_rule.rule.name
}

output "notification_hub_sas_key" {
  value     = azurerm_notification_hub_authorization_rule.rule.primary_access_key
  sensitive = true
}

output "notification_hub_uri" {
  value = azurerm_notification_hub_namespace.ohana-notification-hub-namespace.servicebus_endpoint
}

output "notification_hub_registration_ttl" {
  value = local.var.OHANA.NOTIFICATION_HUB_REGISTRATION_TTL
}

output "disable_csa_integration" {
  value = local.appSettings.DISABLE_CSA_INTEGRATION
}

output "external_environment" {
  value = local.var.INFRASTRUCTURE.IS_EXTERNAL
}

# This output exports the Redis Cache's hostname.
output "redis_hostname" {
  value = azurerm_redis_cache.redis-ohana.hostname
}

# This output exports the Redis Cache's primary access key and is marked as sensitive, meaning it will be redacted from Terraform's logs and console output.
output "redis_key" {
  value     = azurerm_redis_cache.redis-ohana.primary_access_key
  sensitive = true
}

output "fcm_private_key" {
  value     = data.azurerm_key_vault_secret.fcmV1-privateKey.value
  sensitive = true
}

output "fcm_client_email" {
  value     = local.var.OHANA.FCMv1ClientEmail
  sensitive = true
}

output "fcm_project_id" {
  value     = local.var.OHANA.FCMv1ProjectID
  sensitive = true
}

output "notification_hub_namespace_name" {
  value = azurerm_notification_hub_namespace.ohana-notification-hub-namespace.name
}

output "notification_hub_name" {
  value = azurerm_notification_hub.ohana-notification-hub.name
}

output "subscription_id" {
  value     = local.var.INFRASTRUCTURE.SUBSCRIPTIONID
  sensitive = true
}
