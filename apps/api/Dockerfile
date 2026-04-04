FROM oven/bun:1 AS base
WORKDIR /app

# Install Playwright system dependencies + Chromium
RUN apt-get update && apt-get install -y \
  wget \
  gnupg \
  ca-certificates \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# Copy package files and install deps
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Install Playwright's Chromium binary
RUN bunx playwright install chromium --with-deps

# Copy source
COPY . .

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
