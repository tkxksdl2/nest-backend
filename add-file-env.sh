#!/bin/bash
set -euo pipefail

# file_env() function imported from MySQL8 docker image
# usage: file_env VAR [DEFAULT]
#    ie: file_env 'XYZ_DB_PASSWORD' 'example'
# (will allow for "$XYZ_DB_PASSWORD_FILE" to fill in the value of
#  "$XYZ_DB_PASSWORD" from a file, especially for Docker's secrets feature)
file_env() {
	local var="$1"
	local fileVar="${var}_FILE"
	local def="${2:-}"
	if [ "${!var:-}" ] && [ "${!fileVar:-}" ]; then
		echo >&2 "Both $var and $fileVar are already set"
		exit 1
	fi
	local val="$def"
	if [ "${!var:-}" ]; then
		val="${!var}"
	elif [ "${!fileVar:-}" ]; then
		val="$(< "${!fileVar}")"
	fi
	export "$var"="$val"
	unset "$fileVar"
}

# Import original DB envs of Ghost5
envs=(
	"DB_PASSWORD"
	"PRIVATE_KEY"
	"MAILGUN_API_KEY"
	"MAILGUN_DOMAIN_NAME"
    "MAILGUN_FROM_EMAIL"
    "AWS_ACCESS_KEY"
    "AWS_SECRET_ACCESS_KEY"
)

# Run file_env() to fill the value of every original env from either $var or $fileVar
for env in "${envs[@]}"; do
	file_env "$env"
done

# Call the original entrypoint bash script
source docker-entrypoint.sh