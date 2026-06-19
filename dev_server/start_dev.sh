#!/bin/bash

# Zed runs scripts at project root for CWD, so first `cd` into where this script is located
script_directory=$(dirname "$0")

cd "$script_directory"

python3 local_serve.py
