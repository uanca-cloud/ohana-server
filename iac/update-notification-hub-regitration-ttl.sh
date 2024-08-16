#!/bin/bash

EXPIRY=${EXPIRY:=$((60 * 60 * 24 * 7))}

ENCODED_URI=$(echo -n $EVENTHUB_URI | jq -s -R -r @uri)
TTL=$(($(date +%s) + $EXPIRY))
UTF8_SIGNATURE=$(printf "%s\n%s" $ENCODED_URI $TTL | iconv -t utf8)

HASH=$(echo -n "$UTF8_SIGNATURE" | openssl sha256 -hmac $SHARED_ACCESS_KEY -binary | base64)
ENCODED_HASH=$(echo -n $HASH | jq -s -R -r @uri)

TOKEN=$(echo -n "SharedAccessSignature sr=$ENCODED_URI&sig=$ENCODED_HASH&se=$TTL&skn=$SHARED_ACCESS_KEY_NAME")

curl --location --request GET "$EVENTHUB_URI" \
--header 'Content-Type: application/xml;type=entry;charset=utf-8' \
--header 'x-ms-version: 2015-01' \
--header "Authorization: ${TOKEN}" >> output.txt

sed -i "s|<RegistrationTtl>P[0-9a-zA-Z]*</RegistrationTtl>|<RegistrationTtl>P${REGISTRATION_TTL}D</RegistrationTtl>|" ./output.txt

BODY=$(cat ./output.txt)

curl --location --request PUT "$EVENTHUB_URI" \
--header 'Content-Type: application/xml;type=entry;charset=utf-8' \
--header 'x-ms-version: 2015-01' \
--header "Authorization: ${TOKEN}" \
--header 'If-Match: *' \
--data-raw "$BODY"
