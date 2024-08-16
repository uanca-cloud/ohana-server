resource "azurerm_servicebus_namespace" "service-bus-ohana" {
  name                = "service-bus-namespace-${local.NAME_PATTERN}"
  resource_group_name = data.azurerm_resource_group.rg.name
  location            = data.azurerm_resource_group.rg.location
  sku                 = local.var.OHANA.SERVICE_BUS_SKU
  tags                = local.tags
}

resource "azurerm_servicebus_queue" "servicebusaudit" {
  name                = "servicebusaudit"
  namespace_id        = azurerm_servicebus_namespace.service-bus-ohana.id
  enable_partitioning = false
  depends_on          = [azurerm_servicebus_namespace.service-bus-ohana]
  lifecycle {
    ignore_changes = [namespace_id]
  }
}

resource "azurerm_servicebus_queue" "servicebussms" {
  name                = "servicebussms"
  namespace_id        = azurerm_servicebus_namespace.service-bus-ohana.id
  enable_partitioning = false
  depends_on          = [azurerm_servicebus_namespace.service-bus-ohana]
  lifecycle {
    ignore_changes = [namespace_id]
  }
}