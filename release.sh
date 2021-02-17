#!/bin/bash

set -e

# Make sure we are at the project's root
cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null

if [[ "$1" != "patch" && "S1" != "minor" && "$1" != "major" ]]; then
    echo "Usage: $0 [major|minor|patch]"
    exit 1
fi

# Ensure the working directory is clean
if [[ ! -z `git status --porcelain` ]]; then
    echo "Working directory is not clean. Aborting."
    exit 1
fi

# Apply the version change
npm version $1

# Push changes and tags
git push && git push --tags

# Publish to NPM
npm publish
