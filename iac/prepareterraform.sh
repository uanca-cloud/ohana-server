#!/bin/bash
OPTS=$(getopt -o h -n prepareterraform --longoptions environment:,region:,skipinit -- "$@")

eval set -- "$OPTS"
while true; do
    case "$1" in
        --environment)            
            shift; # The arg is next in position args
            ENVIRONMENT=$1
            ;;
        --region)            
            shift; # The arg is next in position args
            REGION=$1
            ;;   
        --skipinit)            
            SKIPINIT=1
            ;;   
        --)
            shift
            break
            ;;
        esac
        shift
done

if [[ ! $ENVIRONMENT =~ ^(DEV|TEST|HFX|AUT|STAGE|DEMO|SBX|PROD)$ ]]
then
    echo "Incorrect environment provided: $ENVIRONMENT"
    exit 1
fi

if [ -z "$REGION" ]; then REGION="US"; fi

# Subscription where the infrastructure App Config lives
sub="Care Communications Production"
# Name of the infrastructure App Config
appConfigInfra="VLT-Infrastructure-Appconfig"
# Name of your product AppConfig
appConfigProduct="VLT-OhanaServer-AppConfig"

#Script Variables
exportFileInfra=".terraform/infra-export.json"
exportFileProduct=".terraform/product-export.json"
backendConf=".terraform/backend.conf"
labels="$ENVIRONMENT,$REGION,ALL"

function Initialize-Backend () {
    servicename=$(cat $exportFileProduct | grep SERVICENAMESHORT | cut -d'"' -f 4)
    appprefix=$(cat $exportFileInfra | grep AppPrefix | cut -d'"' -f 4)
    environment=$(cat $exportFileInfra | grep ENVIRONMENT | cut -d'"' -f 4)
    azureregion=$(cat $exportFileInfra | grep AZUREREGIONSHORT | cut -d'"' -f 4)
    sastoken=$(cat $exportFileInfra | grep TERRAFORMCLIENTSAS | cut -d'"' -f 4)
    cat > $backendConf <<- EOM
    storage_account_name = "vltinfrastructuresa"
    container_name       = "tfstate"
    key                  = "$appprefix-$environment.$azureregion.$servicename.terraform.tfstate"
    sas_token            = "$sastoken"
EOM
}

function Initialize-LocalEnvironment () {
    echo "Initializing the local environment..."
    if [[ -f ".terraform/terraform.tfstate" ]]
    then
        echo "Found existing environment, checking for which one..."
        currentenv=$(jq .backend.config.key .terraform/terraform.tfstate | tr -d '"' | cut -d "-" -f 2 | cut -d "." -f 1)
        echo "Existing environment: $currentenv"
    fi
    if  [ "$currentenv" != "$ENVIRONMENT" ]
    then
        echo "Existing environment doesn't match target environment, purging files..."
        rm -rf .terraform
    fi
    if [[ -d ".terraform" ]]
    then
        rm -f $exportFileInfra $exportFileProduct $backendConf
    else
        mkdir .terraform
    fi
}
Initialize-LocalEnvironment

echo "Retrieving and exporting Infrastructure App Config for labels: $labels..."
az appconfig kv export --name $appConfigInfra -d file --path $exportFileInfra --format json --yes --label $labels --auth-mode login --resolve-keyvault --subscription "$sub" --separator ":"

echo "Retrieving and exporting Product App Config for labels: $labels..."
az appconfig kv export --name $appConfigProduct -d file --path $exportFileProduct --format json --yes --label $labels --auth-mode login --resolve-keyvault --subscription "$sub" --separator ":"

if [[ -f $exportFileInfra ]] && [[ -f $exportFileProduct ]]
then
    Initialize-Backend 
    if [ -z "$SKIPINIT" ]; then terraform init --backend-config=$backendConf; fi
else
    echo "App Config export not found."
    exit 1
fi 