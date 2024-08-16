resource "azurerm_storage_account" "storageaccohanalogs" {
  name                     = "sa${replace(local.NAME_PATTERN, "-", "")}logs"
  resource_group_name      = data.azurerm_resource_group.rg.name
  location                 = data.azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
  account_kind             = "StorageV2"

  tags = local.tags
}

resource "azurerm_storage_account" "storageaccohana" {
  name                     = "sa${replace(local.NAME_PATTERN, "-", "")}"
  resource_group_name      = data.azurerm_resource_group.rg.name
  location                 = data.azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
  account_kind             = "StorageV2"

  ### enable static website on containers account_kind needs to be StorageV2 as well
  static_website {
    error_404_document = "admin/index.html"
    index_document     = "index.html"
  }
  tags = local.tags
}

resource "azurerm_storage_container" "audit" {
  name                  = "audit"
  storage_account_name  = azurerm_storage_account.storageaccohana.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "media" {
  name                  = "media"
  storage_account_name  = azurerm_storage_account.storageaccohana.name
  container_access_type = "private"
}

resource "azurerm_storage_blob" "indexhtml" {
  name                   = "index.html"
  storage_account_name   = azurerm_storage_account.storageaccohana.name
  storage_container_name = "$web"
  type                   = "Block"
  source                 = "${abspath(path.root)}/../admin/index.html"

  lifecycle {
    ignore_changes = [parallelism, size, source, content_md5]
  }
}

resource "azurerm_storage_blob" "assetlinks" {
  name                   = ".well-known/assetlinks.json"
  storage_account_name   = azurerm_storage_account.storageaccohana.name
  storage_container_name = "$web"
  type                   = "Block"
  source                 = "${abspath(path.root)}/../.well-known/assetlinks.json"
  lifecycle {
    ignore_changes = [parallelism, size, source, content_md5]
  }
}

resource "azurerm_storage_blob" "apple-app-site-association" {
  name                   = ".well-known/apple-app-site-association"
  storage_account_name   = azurerm_storage_account.storageaccohana.name
  storage_container_name = "$web"
  type                   = "Block"
  source                 = "${abspath(path.root)}/../.well-known/apple-app-site-association"

  lifecycle {
    ignore_changes = [parallelism, size, source, content_md5]
  }
}
