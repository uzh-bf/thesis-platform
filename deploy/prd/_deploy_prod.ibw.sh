#!/bin/bash

# Thin wrapper for QA environment. All logic lives in ../_doppler_deploy_common.sh
# See that file for full documentation.
CONFIG="prd_ibw"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_doppler_deploy_common.sh" --selector=app=thesis-platform-ibw "$@"

# source never returns on success; if we get here, something went wrong.
exit 1
