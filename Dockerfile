# Install dependencies only when needed
FROM node:18.12.0-alpine AS deps

# Install pnpm globally
RUN npm install -g --ignore-scripts pnpm@9.14.3

# Set the working directory and copy dependency files
WORKDIR /app
COPY package.json pnpm-lock.yaml ./

# Install dependencies with pnpm
RUN pnpm install --ignore-scripts --frozen-lockfile

# Rebuild the source code only when needed
FROM node:18.12.0-alpine AS builder

# Install pnpm again in the builder stage
RUN npm install -g --ignore-scripts pnpm@9.14.3

# Install any additional system dependencies
RUN apk add --no-cache libc6-compat

# Set the working directory and copy files
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN pnpm run build

# Production image, copy all the built files and run the app
FROM node:18.12.0-alpine AS runner

# Set the working directory
WORKDIR /app

# Create a non-root user for running the application
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the build output and static files from the builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set environment variables
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV
ENV NEXT_TELEMETRY_DISABLED=1

# Set user and expose the port
USER nextjs
EXPOSE 3000
ENV PORT=3000

# Start the application
CMD ["node", "server.js"]
