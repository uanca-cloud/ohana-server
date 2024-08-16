# We strongly recommend using the required_providers block to set the
# Azure Provider source and version being used
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "= 3.82.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "= 2.33.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "3.4.3"
    }
    http = {
      source  = "hashicorp/http"
      version = "3.2.1"
    }
    null = {
      source  = "hashicorp/null"
      version = "3.2.1"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "2.9.0"
    }
    rabbitmq = {
      source  = "cyrilgdn/rabbitmq"
      version = "1.8.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "2.18.0"
    }
    kubectl = {
      source  = "gavinbunney/kubectl"
      version = "1.14.0"
    }
  }
  backend "azurerm" {}
}

data "azurerm_client_config" "current" {}
data "azuread_client_config" "current" {}

#This is the default provider where we are going to build things
provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = true
    }
  }
  subscription_id = local.var.INFRASTRUCTURE.SUBSCRIPTIONID
  client_id       = local.var.INFRASTRUCTURE.TERRAFORMCLIENTID
  client_secret   = local.var.INFRASTRUCTURE.TERRAFORMCLIENTSECRET
  tenant_id       = local.var.INFRASTRUCTURE.TENANTHOME
}

#This provider is for the Non-SOC Subscription
provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = true
    }
  }
  alias                      = "CCProd"
  subscription_id            = local.var.INFRASTRUCTURE.CCPRODVAULTSUBID
  client_id                  = local.var.INFRASTRUCTURE.TERRAFORMCLIENTID
  client_secret              = local.var.INFRASTRUCTURE.TERRAFORMCLIENTSECRET
  tenant_id                  = local.var.INFRASTRUCTURE.TENANTHOME
  skip_provider_registration = true
}

#This is the Azure Active Directory
provider "azuread" {

  client_id     = local.var.INFRASTRUCTURE.TERRAFORMCLIENTID
  client_secret = local.var.INFRASTRUCTURE.TERRAFORMCLIENTSECRET
  tenant_id     = local.var.INFRASTRUCTURE.TENANTHOME
}

data "azuread_service_principal" "pipelinesp" {
  application_id = local.var.INFRASTRUCTURE.PIPELINESP
}

data "azurerm_user_assigned_identity" "ohana" {
  resource_group_name = data.azurerm_resource_group.ohana-core-rg.name
  name                = local.var.OHANA.MANAGED_IDENTITY
}

# data "azurerm_dns_zone" "dns" {
#   provider            = azurerm.CCProd
#   resource_group_name = data.azurerm_resource_group.regional-rg.name
#   name                = local.var.INFRASTRUCTURE.DNSSUFFIX
# }

locals {
  tags = {
    BU             = local.var.OHANA.BU #old BU: 95339
    Email          = lower(local.var.INFRASTRUCTURE.Email)
    Owner          = local.var.INFRASTRUCTURE.OWNER
    Project        = local.var.OHANA.Project
    autoOff        = "23"
    autoOn         = "99"
    autoWeekendOff = "23"
    autoWeekendOn  = "99"
    Environment    = local.var.INFRASTRUCTURE.ENVIRONMENT
    # Application    = local.var.OHANA.SERVICENAMESHORT
  }
  hometenant               = local.var.INFRASTRUCTURE.TENANTHOME
  AppPrefix                = local.var.INFRASTRUCTURE.AppPrefix
  IS_AUTOMATED_TESTING_ENV = contains([
    "HFX", "AUT"
  ], local.var.INFRASTRUCTURE.ENVIRONMENT) ? "true" : "false"
  DHP_INTEGRATION_ENV = contains([
    "AUT"
  ], local.var.INFRASTRUCTURE.ENVIRONMENT) ? "TEST" : local.var.INFRASTRUCTURE.ENVIRONMENT

  var = merge(jsondecode(file(".terraform/infra-export.json")), jsondecode(file(".terraform/product-export.json")))

  NAME_PATTERN_PREFIX           = local.var.INFRASTRUCTURE.IS_PRODUCTION == "true" ? "prod" : "dev"
  NAME_PATTERN                  = "${local.NAME_PATTERN_PREFIX}-${local.var.OHANA.SERVICENAME}-${local.var.OHANA.ENVIRONMENT}"
  key_vault_secret_env_prefix_0 = contains([
    "DEV"
  ], upper(local.var.OHANA.ENVIRONMENT)) ? "DEVELOPMENT" : upper(local.var.OHANA.ENVIRONMENT)
  key_vault_secret_env_prefix = contains([
    "PROD"
  ], upper(local.key_vault_secret_env_prefix_0)) ? "PRODUCTION" : upper(local.key_vault_secret_env_prefix_0)

  BU = contains([
    "SBX", "PROD"
  ], local.var.INFRASTRUCTURE.ENVIRONMENT) ? "FAMILY_INP" : local.var.OHANA.BU

}
