<#
    .SYNOPSIS
        This script prepares the local machine for a given Terraform deployment.  See YOURAPP section below on first setup

    .DESCRIPTION
        This script initializes the local machine for a Terraform deployment. Existing
        Terraform files are checked and deleted if they do not match the requested
        deployment. The necessary App Config is downloaded, then the files in the
        Template directory are copied and have their variables replaced with appropriate
        values from App Config. Terraform is then initialized if necessary, unless the
        "-SkipInit" flag is set.

        The "-Verbose" flag is supported for more extensive output.

        
    .EXAMPLE
        PrepareTerraform.ps1
        Defaults to the DEV environment in the US region.

    .EXAMPLE
        PrepareTerraform.ps1 -Environment TEST -Region US -SkipInit
        Prepares the local Terraform deployment for the TEST environment in the US region.
        Since the -SkipInit flag is set, even if the local Terraform environment is
        uninitialized, the "terraform init" command will not be run.
#>
[CmdletBinding()]
param(
    [Parameter()]
    [ValidateSet("DEV","TEST","HFX","AUT","STAGE","SBX","PROD","DEMO",
    IgnoreCase = $false,
    ErrorMessage = "'{0}' is an invalid environment. Environment must be one of: '{1}'")]
    [string]
    # Specifies the target environment for deployment, e.g. DEV, TEST, PROD, etc.
    # Defaults to "DEV"
    $Environment = 'DEV',
    [Parameter()]
    [string]
    # Specifies the two-digit country code for deployment, e.g. US, CA, DE, etc.
    # Defaults to "US"
    $Region = 'US',
    [switch]
    # Skips the Terraform Init at the end, handy for quickly testing changes
    # to this preparation file
    $SkipInit
)

# Subscription where the infrastructure App Config lives
$sub = "Care Communications Production"
# Name of the infrastructure App Config
$appConfigInfra = "VLT-Infrastructure-Appconfig"
# Name of your product AppConfig
$appConfigProduct = "VLT-OhanaServer-AppConfig"

#Script Variables
$exportFileInfra = ".terraform/infra-export.json"
$exportFileProduct = ".terraform/product-export.json"
$backendConf = ".terraform/backend.conf"
$labels = "$Environment,$Region,ALL"

function Initialize-Backend {
    $infrastructureData = Get-Content -Path $exportFileInfra | ConvertFrom-Json
    $productData = Get-Content -Path $exportFileProduct | ConvertFrom-Json
    $serviceName = $productData.$(($productData | Get-Member -MemberType NoteProperty).Name).SERVICENAMESHORT
    $configdata = @"
    storage_account_name = "vltinfrastructuresa"
    container_name       = "tfstate"
    key                  = "$($infrastructureData.INFRASTRUCTURE.AppPrefix)-$($infrastructureData.INFRASTRUCTURE.ENVIRONMENT).$($infrastructureData.INFRASTRUCTURE.AZUREREGIONSHORT).$serviceName.terraform.tfstate"
    sas_token            = "$($infrastructureData.INFRASTRUCTURE.TERRAFORMCLIENTSAS)"
"@
    New-Item -ItemType File -Name $backendConf -Value $configdata | Out-Null

}
function Initialize-LocalEnvironment {
    Write-Host "Initializing the local environment..."
    # Get the current environment
    if (test-path -Path '.terraform/terraform.tfstate') {
        Write-Verbose "Found existing environment, checking for which one..."
        $current_config_file = get-content ".terraform/terraform.tfstate" | ConvertFrom-Json
        $current_config_key = $current_config_file.backend.config.key
        $currentEnvironment = (($current_config_key).split('-')[$current_config_key.split('-').count - 1]).split('.')[0]
        Write-Verbose "Existing environment is $currentEnvironment"
    }

    # If the current environment doesn't match
    # our target environment, purge it
    If ($Environment -ne $currentEnvironment) {
        Write-Verbose "Existing environment doesn't match target environment, purging files..."
        Remove-Item -Recurse -Path .terraform\ -Force -ErrorAction SilentlyContinue
    }

    #Even if the current envinronment matches, delete config files
    if (test-path -Path ".terraform\") {
        Remove-Item -Path $exportFileInfra -Force -Confirm:$false 
        Remove-Item -Path $exportFileProduct -Force -Confirm:$false 
        Remove-Item -Path $backendConf -Force -Confirm:$false
     } else {
         New-Item -ItemType Directory -Name ".terraform" | Out-Null
     }
}


Initialize-LocalEnvironment

Write-Host "Retrieving and exporting Infrastructure App Config for labels: $labels..."
& az appconfig kv export --name $appConfigInfra -d file --path $exportFileInfra --format json --yes --label $labels --auth-mode login --resolve-keyvault --subscription "$sub" --separator ":"
Write-Host "Retrieving and exporting Product App Config for labels: $labels..."
& az appconfig kv export --name $appConfigProduct -d file --path $exportFileProduct --format json --yes --label $labels --auth-mode login --resolve-keyvault --subscription "$sub" --separator ":"

If ( (Test-Path -Path $exportFileInfra) -and (Test-Path -Path $exportFileProduct) ) {
    write-host "initialize backend"
     Initialize-Backend
     If (!$SkipInit) {
        & terraform init --backend-config=$backendConf
        }
} Else { Write-Error "App Config export not found." }

