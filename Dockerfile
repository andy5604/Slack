FROM node:22-bookworm

# Install build tools required by better-sqlite3 (node-gyp)
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

# Build React frontend
RUN npm install --prefix client && npm run build --prefix client

# Install server dependencies (compiles better-sqlite3 native addon)
RUN npm install --prefix server

EXPOSE 3001

CMD ["node", "server/index.js"]
