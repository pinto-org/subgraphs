#!/bin/bash

ROOT_DIR="$(dirname "$(realpath "$0")")"
cd $ROOT_DIR

test() {
    subgraph_dir="../src/subgraphs/$1"
    cd $subgraph_dir
    graph test
    cd $ROOT_DIR
}

SG_DIR="../src/subgraphs"

subgraph_exists() {
    local dir_path="$1"
    [[ -d "$dir_path" ]]
}

# Either processes for the requested subgraph or all subgraphs if none was provided
process_subgraph() {
    local input="$1"

    if [[ -n "$input" ]]; then
        # If input is provided, check if the directory exists
        local input_dir="$SG_DIR/$input"
        local subgraph=$(basename "$input_dir")
        if ! subgraph_exists "$input_dir"; then
            echo "Error: Subgraph does not exist: $subgraph"
            exit 1
        fi
        echo "Subgraph: $subgraph"
        test $subgraph

    else
        # If no input is provided, iterate through all directories in SG_DIR
        local directories=("$SG_DIR"/*/)
        if [[ ${#directories[@]} -eq 0 ]]; then
            echo "Error: No subgraph directories found in $SG_DIR"
            exit 1
        fi

        for dir in "${directories[@]}"; do
            local subgraph=$(basename "$dir")
            echo "Subgraph: $subgraph"
            test $subgraph
        done
    fi
}
process_subgraph "$1"
