#!/bin/bash

# Install dependencies
npm ci

# Build the frontend
npm run build

# Create data directory for SQLite
mkdir -p server/data

echo "Build completed successfully!" 