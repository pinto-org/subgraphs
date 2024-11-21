#!/bin/bash

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <project>"
  echo "  Example: $0 bean"
  exit 1
fi

for file in src/subgraphs/$1/cache-builder/*.js; do
    if [ -f "$file" ]; then
        node "$file"
    fi
done
