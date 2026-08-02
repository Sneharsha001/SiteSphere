# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — deps: install ALL dependencies (including devDeps for tsc)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS deps

WORKDIR /app

# Install OS-level build tools required by bcrypt's native C++ addon.
# python3, make, g++ are needed by node-gyp to compile the bcrypt binary.
# ca-certificates ensures HTTPS connections to MongoDB Atlas work correctly.
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
        python3 \
        make \
        g++ \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy only the lockfile and manifest first to maximise layer caching.
# Docker will skip re-running npm ci unless these two files change.
COPY package.json package-lock.json ./

# Install ALL deps (including devDependencies like typescript) so we can build.
# --ignore-scripts is intentionally NOT used because bcrypt requires its
# postinstall script to compile the native binary.
RUN npm ci

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — build: compile TypeScript → JavaScript
# ─────────────────────────────────────────────────────────────────────────────
FROM deps AS build

WORKDIR /app

# Copy the full source tree (node_modules already present from deps stage)
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript. Outputs to ./dist (per tsconfig.json outDir)
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 — production: lean runtime image (no devDependencies, no source)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS production

WORKDIR /app

# Install only the OS libraries needed at runtime by bcrypt's native binary.
# We do NOT need python3/make/g++ here — those are build-time only.
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Run as a non-root user for security.
# node:20-slim ships with a built-in 'node' user (UID 1000).
RUN chown -R node:node /app
USER node

# Copy package manifests and install ONLY production dependencies.
# This produces the smallest possible node_modules in the final image.
COPY --chown=node:node package.json package-lock.json ./

# Re-install production deps only.
# bcrypt's prebuilt binary is carried over inside node_modules from npm ci,
# but we need to reinstall cleanly here for the slim image.
RUN npm ci --omit=dev

# Copy compiled JavaScript output from the build stage
COPY --chown=node:node --from=build /app/dist ./dist

# Document the port the application listens on.
# Render reads process.env.PORT at runtime — this is for documentation only.
EXPOSE 5000

# Tini is not available on slim, but node:20 has built-in SIGTERM handling
# via the graceful shutdown code in index.ts. Use exec form to ensure
# signals are delivered directly to the Node process (PID 1 aware).
CMD ["node", "dist/index.js"]
