data "azurerm_kubernetes_cluster" "aks" {
  name                = "${local.var.INFRASTRUCTURE.AppPrefix}-${local.var.INFRASTRUCTURE.ENVIRONMENT}-${local.var.INFRASTRUCTURE.AZUREREGIONSHORT}-AKS"
  resource_group_name = data.azurerm_resource_group.app-rg.name
}

provider "helm" {
  kubernetes {
    host                   = data.azurerm_kubernetes_cluster.aks.kube_admin_config.0.host
    client_certificate     = base64decode(data.azurerm_kubernetes_cluster.aks.kube_admin_config.0.client_certificate)
    client_key             = base64decode(data.azurerm_kubernetes_cluster.aks.kube_admin_config.0.client_key)
    cluster_ca_certificate = base64decode(data.azurerm_kubernetes_cluster.aks.kube_admin_config.0.cluster_ca_certificate)
  }
}

provider "kubernetes" {
  host                   = data.azurerm_kubernetes_cluster.aks.kube_admin_config.0.host
  client_certificate     = base64decode(data.azurerm_kubernetes_cluster.aks.kube_admin_config.0.client_certificate)
  client_key             = base64decode(data.azurerm_kubernetes_cluster.aks.kube_admin_config.0.client_key)
  cluster_ca_certificate = base64decode(data.azurerm_kubernetes_cluster.aks.kube_admin_config.0.cluster_ca_certificate)
}

provider "kubectl" {
  host                   = data.azurerm_kubernetes_cluster.aks.kube_admin_config.0.host
  client_certificate     = base64decode(data.azurerm_kubernetes_cluster.aks.kube_admin_config.0.client_certificate)
  client_key             = base64decode(data.azurerm_kubernetes_cluster.aks.kube_admin_config.0.client_key)
  cluster_ca_certificate = base64decode(data.azurerm_kubernetes_cluster.aks.kube_admin_config.0.cluster_ca_certificate)
  load_config_file       = "false"
}

resource "kubernetes_namespace" "ohana" {
  depends_on = [data.azurerm_kubernetes_cluster.aks]
  metadata {
    name = local.var.OHANA.SERVICENAME
  }
}
