#!/bin/bash

if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <project> <TestName1> [<TestName2> ...]"
    echo "Example: $0 beanstalk field"
    echo "Tests are assumed to be directly in the tests folder for the respective project."
    echo "Do not include .test.ts in this parameter."
    exit 1
fi

ROOT_DIR="$(dirname "$(realpath "$0")")"
cd $ROOT_DIR

DOCKER_ARGS=""

SUBGRAPH_NAME=$1
SUBGRAPH_DIR="$(pwd)/../src/subgraphs/$1"
shift

if [ ! -d "$SUBGRAPH_DIR" ]; then
    echo "Error: Subgraph does not exist: $SUBGRAPH_NAME"
    exit 1
fi

# Loop through the provided test names
for TEST_NAME in "$@"; do
    
    TEST_NAME="$TEST_NAME"
    TEST_NAME_LOWER=$(echo "$TEST_NAME" | tr '[:upper:]' '[:lower:]')

    # Compile assembly script to wasm. This can be done inside docker but is more performant
    # if done prior as we can omit the optimize flag.
    $(pwd)/../node_modules/assemblyscript/bin/asc \
        $SUBGRAPH_DIR/tests/${TEST_NAME}.test.ts \
        $(pwd)/../node_modules/@graphprotocol/graph-ts/global/global.ts \
        --lib $(pwd)/../node_modules \
        --explicitStart \
        --outFile $SUBGRAPH_DIR/tests/.bin/${TEST_NAME_LOWER}.wasm \
        --exportTable \
        --runtime stub \
        --debug

    if [ $? -ne 0 ]; then
        echo "Compilation failed for test $TEST_NAME. Aborting."
        exit 1
    fi

    DOCKER_ARGS+=" $TEST_NAME_LOWER"
done

# Run in docker on the matchstick image
docker run -e ARGS="$DOCKER_ARGS" -it --rm \
    --mount type=bind,source=$SUBGRAPH_DIR/matchstick-docker.yaml,target=/matchstick/matchstick.yaml \
    --mount type=bind,source=$(pwd)/../,target=/matchstick/repo-mounted/ \
    matchstick
