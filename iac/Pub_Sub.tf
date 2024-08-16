resource "azurerm_web_pubsub" "pubsub" {
  name                = "pubsub-${local.NAME_PATTERN}"
  resource_group_name = data.azurerm_resource_group.rg.name
  location            = data.azurerm_resource_group.rg.location

  sku      =  contains(["HFX", "STAGE", "SBX", "PROD"], local.var.INFRASTRUCTURE.ENVIRONMENT) ? "Premium_P1" : "Standard_S1"
  capacity =  contains(["HFX", "STAGE", "SBX", "PROD"], local.var.INFRASTRUCTURE.ENVIRONMENT) ? 2 : 1
  tags                = local.tags

  live_trace {
    enabled                   = true
    messaging_logs_enabled    = true
    connectivity_logs_enabled = true
  }

  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_key_vault_secret" "pubsub-connection-string" {
  depends_on   = [azurerm_key_vault_access_policy.ohana-gen-kv-terraform]
  name         = "pubsub-connection-string"
  value        = azurerm_web_pubsub.pubsub.primary_connection_string
  key_vault_id = azurerm_key_vault.ohana-gen-kv.id
}

resource "azurerm_web_pubsub_hub" "hub" {
  name          = "ohana_pubsub_hub"
  web_pubsub_id = azurerm_web_pubsub.pubsub.id
  anonymous_connections_enabled = false
  event_handler {
      url_template       = "https://${local.OHANAURL}/eventhandler"
      user_event_pattern = "*"
      system_events      = ["connect", "connected", "disconnected"]
    }
}

resource "azurerm_monitor_autoscale_setting" "pubsubscale" {
  count               = contains(["Premium_P1"], azurerm_web_pubsub.pubsub.sku) ? 1 : 0
  name                = "pubsub-${local.NAME_PATTERN}-scale"
  resource_group_name = data.azurerm_resource_group.rg.name
  location            = data.azurerm_resource_group.rg.location
  target_resource_id  = azurerm_web_pubsub.pubsub.id
  tags                = local.tags

  profile {
    name = "default"
    capacity {
      default = azurerm_web_pubsub.pubsub.capacity
      minimum = azurerm_web_pubsub.pubsub.capacity
      maximum = 100
    }
    rule {
      metric_trigger {
        metric_name        = "ConnectionQuotaUtilization"
        metric_resource_id = azurerm_web_pubsub.pubsub.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT10M"
        time_aggregation   = "Average"
        operator           = "GreaterThan"
        threshold          = 70
      }
      scale_action {
        direction = "Increase"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT5M"
      }
    }
    rule {
      metric_trigger {
        metric_name        = "ConnectionQuotaUtilization"
        metric_resource_id = azurerm_web_pubsub.pubsub.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT10M"
        time_aggregation   = "Average"
        operator           = "LessThan"
        threshold          = 30
      }
      scale_action {
        direction = "Decrease"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT5M"
      }
    }
  }
}


