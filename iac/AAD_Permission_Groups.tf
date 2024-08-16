data "azuread_group" "RG-Owners" {
  display_name     = "DL-APP-VLT-US-RG-Owners"
  security_enabled = true
}

data "azuread_group" "VFamilyDevOps" {
  display_name     = "GG-ROLE-Ohana-DevOps Engineer"
  security_enabled = true
}

data "azuread_group" "VFamilyDevAll" {
  display_name     = "GG-ROLE-Ohana-Software Engineer"
  security_enabled = true
}

data "azuread_group" "VFamilyQEManual" {
  display_name     = "GG-ROLE-Ohana-Quality Engineer - Manual"
  security_enabled = true
}

data "azuread_group" "VFamilyQEAutomation" {
  display_name     = "GG-ROLE-Ohana-Quality Engineer - Automation"
  security_enabled = true
}

data "azuread_group" "PROD-Owners" {
  display_name     = "DL-APP-VLT-US-RG-PROD-Owners"
  security_enabled = true
}
