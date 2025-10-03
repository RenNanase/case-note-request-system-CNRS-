#!/bin/bash

# Fix all value/label property names to id/name in TypeScript files

echo "Fixing interface mismatches..."

# Find and replace all occurrences in src/pages/
find src/pages/ -name "*.tsx" -exec sed -i 's/dept\.value/dept.id/g' {} \;
find src/pages/ -name "*.tsx" -exec sed -i 's/dept\.label/dept.name/g' {} \;
find src/pages/ -name "*.tsx" -exec sed -i 's/location\.value/location.id/g' {} \;
find src/pages/ -name "*.tsx" -exec sed -i 's/location\.label/location.name/g' {} \;
find src/pages/ -name "*.tsx" -exec sed -i 's/doctor\.value/doctor.id/g' {} \;
find src/pages/ -name "*.tsx" -exec sed -i 's/doctor\.label/doctor.name/g' {} \;

# Find and replace all occurrences in src/components/
find src/components/ -name "*.tsx" -exec sed -i 's/dept\.value/dept.id/g' {} \;
find src/components/ -name "*.tsx" -exec sed -i 's/dept\.label/dept.name/g' {} \;
find src/components/ -name "*.tsx" -exec sed -i 's/location\.value/location.id/g' {} \;
find src/components/ -name "*.tsx" -exec sed -i 's/location\.label/location.name/g' {} \;
find src/components/ -name "*.tsx" -exec sed -i 's/doctor\.value/doctor.id/g' {} \;
find src/components/ -name "*.tsx" -exec sed -i 's/doctor\.label/doctor.name/g' {} \;

echo "Done!"

