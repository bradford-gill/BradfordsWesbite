#!/bin/bash

# Using a local deploy script instead of GitHub Actions because the repo is on
# a free GitHub plan, which does not include Actions minutes for private repos.

set -e

SERVER_USER="ubuntu"
SERVER_HOST="54.210.244.233"
SSH_KEY="$HOME/Desktop/LightsailDefaultKey-us-east-1.pem"

echo "Pushing to main..."
git push origin main

echo "Deploying to $SERVER_HOST..."
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" '
  cd ~/BradfordsWesbite &&
  git pull origin main &&
  docker compose up --build -d
'

echo "Done! Site is live."
