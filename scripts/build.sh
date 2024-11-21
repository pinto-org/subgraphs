#!/bin/bash

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <project> <manifest>"
  echo "  Example: $0 bean arbitrum"
  exit 1
fi

cd "$(dirname "$0")"

build_dir="../src/subgraphs/$1/build"
bash ./codegen.sh $1
rm -rf $build_dir
graph build --output-dir $build_dir ../src/subgraphs/$1/manifests/$2.yaml

