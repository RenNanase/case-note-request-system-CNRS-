#!/bin/bash

echo "🚀 Building CRNS for Network Server Deployment..."

# Exit on any error
set -e

echo "📦 Installing dependencies..."
npm install
cd frontend && npm install && cd ..

echo "🔨 Building frontend with /crns/ base path..."
cd frontend
npm run build
cd ..

echo "🔨 Building Laravel assets with /crns/ base path..."
npm run build

echo "📁 Copying frontend build to public directory..."
cp -r frontend/dist/* public/frontend/

echo "✅ Build complete! Frontend assets are now in public/frontend/"
echo ""
echo "📋 What was built:"
echo "   ✓ Frontend built with base: '/crns/'"
echo "   ✓ Laravel assets built with base: '/crns/'"
echo "   ✓ Assets will be loaded from: /crns/assets/, /crns/build/"
echo ""
echo "🌐 Deploy the entire project to your network server"
echo "   Make sure it's accessible at: http://10.2.10.178/crns/"
echo ""
echo "🔗 After deployment, access your application at:"
echo "   http://10.2.10.178/crns/"
echo ""
echo "🔒 This configuration won't interfere with other projects"
