# This Azure resource creates a Redis Cache instance.
# Configuration options like the `capacity`, `family`, `sku_name`, and Redis instance name are sourced from local variables.
resource "azurerm_redis_cache" "redis-ohana" {
  name                = "redis-${local.NAME_PATTERN}"
  resource_group_name = data.azurerm_resource_group.rg.name
  location            = data.azurerm_resource_group.rg.location
  capacity            = local.var.OHANA.REDIS_CAPACITY
  family              = local.var.OHANA.REDIS_FAMILY
  sku_name            = local.var.OHANA.REDIS_SKU
  // enable_non_ssl_port           = false
  minimum_tls_version = "1.2"
  tags                = local.tags
}

# This local value generates a connection string for the Redis Cache.
locals {
  redis-connection-string = "rediss://:${azurerm_redis_cache.redis-ohana.primary_access_key}@${azurerm_redis_cache.redis-ohana.hostname}:${azurerm_redis_cache.redis-ohana.ssl_port}"
}
