#!/bin/bash

set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd $SCRIPT_DIR/..

rm -rf coverage
mkdir -p coverage/workspaces
pnpm -r exec bash -c '[ ! -f coverage/coverage-final.json ] && exit 0 || cp coverage/coverage-final.json '$(pwd)'/coverage/workspaces/$(basename $(pwd))-coverage-final.json'
pnpm nyc merge coverage/workspaces coverage/monorepo-coverage.json
pnpm nyc report -t coverage --report-dir coverage/html --reporter=html-spa
