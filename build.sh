#!/bin/bash

echo "Starting build process..."

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build the frontend
echo "Building the frontend..."
npm run build

# Check if dist folder was created
echo "Checking if dist folder was created..."
if [ -d "dist" ]; then
    echo "✅ dist folder exists"
    ls -la dist/
else
    echo "❌ dist folder does not exist"
    echo "Current directory contents:"
    ls -la
fi

echo "Build completed successfully!" 