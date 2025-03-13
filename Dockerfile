# Stage: monolith-builder
# Purpose: Uses the Rust image to build monolith
# Notes:
#  - Fine to leave extra here, as only the resulting binary is copied out
FROM docker.io/rust:1-bookworm AS monolith-builder

RUN --mount=type=cache,target=/app/target/ \
    --mount=type=cache,target=/usr/local/cargo/git/db \
    --mount=type=cache,target=/usr/local/cargo/registry/ \
    set -eux && \
    cargo install --locked monolith

# Stage: main-app
# Purpose: Compiles the frontend and
# Notes:
#  - Nothing extra should be left here.  All commands should cleanup
FROM node:18-bookworm-slim AS main-app

ARG DEBIAN_FRONTEND=noninteractive

ENV PLAYWRIGHT_BROWSERS_PATH=/data/.cache/ms-playwright

RUN rm -f /etc/apt/apt.conf.d/docker-clean; echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    set -eux && \
    # Install curl for healthcheck, and ca-certificates to prevent monolith from failing to retrieve resources due to invalid certificates
    apt-get update && \
    apt-get install -yq --no-install-recommends \
        curl ca-certificates

RUN mkdir /data

WORKDIR /data

COPY ./package.json ./yarn.lock ./playwright.config.ts ./

RUN --mount=type=cache,sharing=locked,target=/usr/local/share/.cache/yarn \
    set -eux && \
    yarn install --network-timeout 10000000

# Copy the compiled monolith binary from the builder stage
COPY --from=monolith-builder /usr/local/cargo/bin/monolith /usr/local/bin/monolith

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \ 
    --mount=type=cache,sharing=locked,target=/usr/local/share/.cache/yarn \
    --mount=type=cache,target=/root/.npm \
    set -eux && \
    npx playwright install --with-deps chromium

COPY . .

RUN --mount=type=cache,sharing=locked,target=/usr/local/share/.cache/yarn \
    yarn prisma generate && \
    yarn build

HEALTHCHECK --interval=30s \
            --timeout=5s \
            --start-period=10s \
            --retries=3 \
            CMD [ "/usr/bin/curl", "--silent", "--fail", "http://127.0.0.1:3000/" ]

EXPOSE 3000

CMD yarn prisma migrate deploy && yarn start
