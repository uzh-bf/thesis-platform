#!/bin/sh

doppler run --config prd_ibw -- bash -c "cat values-envsubst.yaml | envsubst > .values-SECRET.yaml"
doppler run --config prd_ibw -- helmfile -f helmfile.ibw.yaml $1
