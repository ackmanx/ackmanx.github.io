#!/usr/bin/env bash

# Move to Github pages repo
cd /Volumes/Storage/Code/ackmanx.github.io/docs

ls -l

# Clear old report
rm -rf every

ls -l

# # Create directory again
mkdir every

ls -l

# # Copy contents of new report cache to Github pages repo
cp -r /Volumes/Storage/Code/every-static-html-version/* every

# # Commit new changes
git add .
git commit -m "every"

# # Push to Github and it will auto-deploy
git push
git push github
