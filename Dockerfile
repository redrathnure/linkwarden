# Stage: monolith-builder
# Purpose: Uses the Rust image to build monolith
# Notes:
#  - Fine to leave extra here, as only the resulting binary is copied out
FROM docker.io/rust:1-trixie AS monolith-builder

RUN --mount=type=cache,target=/app/target/ \
    --mount=type=cache,target=/usr/local/cargo/git/db \
    --mount=type=cache,target=/usr/local/cargo/registry/ \
    set -eux && \
    cargo install --locked monolith

# Stage: main-app
# Purpose: Compiles the frontend and
# Notes:
#  - Nothing extra should be left here.  All commands should cleanup
FROM node:20.19.6-trixie-slim AS main-app

ENV YARN_HTTP_TIMEOUT=10000000

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

ENV PRISMA_HIDE_UPDATE_MESSAGE=1

ARG DEBIAN_FRONTEND=noninteractive

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    set -eux && \
    rm -f /etc/apt/apt.conf.d/docker-clean; echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache && \
    # Install curl for healthcheck, and ca-certificates to prevent monolith from failing to retrieve resources due to invalid certificates
    apt-get update && \
    apt-get install -yq --no-install-recommends \
        curl ca-certificates

RUN mkdir /data

WORKDIR /data

RUN corepack enable

COPY ./.yarnrc.yml ./

COPY ./apps/web/package.json ./apps/web/playwright.config.ts ./apps/web/

COPY ./apps/worker/package.json ./apps/worker/

COPY ./packages ./packages

COPY ./yarn.lock ./package.json ./

RUN --mount=type=cache,sharing=locked,target=/usr/local/share/.cache/yarn \
    --mount=type=cache,uid=1000,gid=1000,sharing=locked,target=/home/node/.yarn \
    --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    --mount=type=cache,uid=1000,gid=1000,sharing=locked,target=/home/node/.cache \
    --mount=type=cache,target=/root/.npm \
    set -eux && \
    yarn workspaces focus linkwarden @linkwarden/web @linkwarden/worker

# Copy the compiled monolith binary from the builder stage
COPY --from=monolith-builder /usr/local/cargo/bin/monolith /usr/local/bin/monolith

COPY . .

RUN --mount=type=cache,sharing=locked,target=/usr/local/share/.cache/yarn \
    --mount=type=cache,uid=1000,gid=1000,sharing=locked,target=/home/node/.yarn \
    --mount=type=cache,uid=1000,gid=1000,sharing=locked,target=/home/node/.cache \
    yarn prisma:generate && \
    yarn web:build && \
    rm -rf apps/web/.next/cache

HEALTHCHECK --interval=30s \
            --timeout=5s \
            --start-period=10s \
            --retries=3 \
            CMD [ "/usr/bin/curl", "--silent", "--fail", "http://127.0.0.1:3000/" ]

EXPOSE 3000

CMD ["sh", "-c", "yarn prisma:deploy && yarn concurrently:start"]
