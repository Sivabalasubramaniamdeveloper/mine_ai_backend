# Use the official Playwright container with all browser dependencies pre-installed
FROM mcr.microsoft.com/playwright:v1.63.0-noble

WORKDIR /app

# Copy package manifests first for efficient layer caching
COPY package*.json ./

# Install npm dependencies
RUN npm ci

# Ensure Chromium and dependencies are installed
RUN npx playwright install chromium --with-deps

# Copy the rest of the application code
COPY . .

# Expose Railway's dynamic port
EXPOSE 3000

# Start server
CMD ["npm", "start"]