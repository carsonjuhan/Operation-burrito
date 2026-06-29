#!/bin/bash
set -e

# Check for AWS CLI installation
if ! command -v aws &> /dev/null; then
    echo "AWS CLI not found. Please install AWS CLI."
    exit 1
fi

# Build the application (adjust build command as needed)
echo "Building application..."
# Example for npm-based projects:
npm install
npm run build

# Stamp the service worker with a unique cache version per deploy so browsers
# reinstall the SW and purge stale caches (otherwise users keep old JS).
SW_VERSION="ob-$(git rev-parse --short HEAD 2>/dev/null || date +%s)"
echo "Stamping service worker cache version: $SW_VERSION"
perl -pi -e "s/const CACHE_VERSION = '[^']*';/const CACHE_VERSION = '$SW_VERSION';/" ./out/sw.js

BUCKET_NAME="baby.juhan.me"

# Sync build output to S3 (adjust 'build' directory as needed)
echo "Deploying to S3 bucket $BUCKET_NAME..."
aws s3 sync ./out s3://$BUCKET_NAME

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id E2Y18KDSAQFD48 --paths "/*"

echo "Deployment completed successfully!"