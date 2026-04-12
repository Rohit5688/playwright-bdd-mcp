# Phase 22: Dockerfile for TestForge
# Uses Playwright base image to ensure all browser dependencies are present.

FROM mcr.microsoft.com/playwright:v1.50.1-jammy

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# The MCP server runs on stdio by default.
# If running as a remote SSE server, port exposure is needed.
EXPOSE 3000

# Set environment variables for Playwright
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV DEBUG=pw:browser*

# Entry point
ENTRYPOINT ["node", "dist/index.js"]
