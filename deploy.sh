#!/bin/bash

# Deployment Script for Village Committee App

echo "Starting deployment..."

# 1. Pull latest changes
echo "Pulling latest changes from git..."
git pull origin main

# 2. Install Backend Dependencies
echo "Installing backend dependencies..."
cd backend
npm install

# 3. Create Uploads Directory if not exists
mkdir -p uploads

# 4. Run Migrations
echo "Running database migrations..."
npm run migrate

# 5. Restart Backend PM2 Process
echo "Restarting backend service..."
pm2 restart village-backend || pm2 start src/index.js --name "village-backend"

echo "Deployment completed successfully!"
