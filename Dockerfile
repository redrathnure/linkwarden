# Stage: monolith-builder
# Purpose: Uses the Rust image to build monolith
# Notes:
#  - Fine to leave extra here, as only the resulting binary is copied out
FROM docker.io/rust:1-bookworm AS monolith-builder

# Build monolith
RUN --mount=type=cache,target=/app/target/ \
    --mount=type=cache,target=/usr/local/cargo/git/db \
    --mount=type=cache,target=/usr/local/cargo/registry/ \
    set -eux && \
    cargo install --locked monolith

# Stage: main-app
# Purpose: Compiles the frontend and
# Notes:
#  - Nothing extra should be left here.  All commands should cleanup
FROM node:22.14-bookworm-slim AS main-app

ARG DEBIAN_FRONTEND=noninteractive

ENV SRV_DATA_ROOT=/data
ENV PLAYWRIGHT_BROWSERS_PATH=$SRV_DATA_ROOT/.cache/ms-playwright

# Copy the compiled monolith binary from the builder stage
COPY --from=monolith-builder /usr/local/cargo/bin/monolith /usr/local/bin/monolith

# Lazy version, https://github.com/tianon/gosu/blob/master/INSTALL.md
COPY --from=tianon/gosu /gosu /usr/local/bin/
COPY --chown=node:node docker/bin/docker-entrypoint.sh /


RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    set -eux && \
    rm -f /etc/apt/apt.conf.d/docker-clean; echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache && \
    # Install curl for healthcheck, and ca-certificates to prevent monolith from failing to retrieve resources due to invalid certificates
    apt-get update && \
    apt-get install -yq --no-install-recommends \
        curl ca-certificates \
        sudo \
        tini && \
    # playwright installation would need sudo to install system packages
    echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers && \
    usermod -a -G sudo node && \
    chmod ugo+rx,go-w /docker-entrypoint.sh && \
    mkdir -p $SRV_DATA_ROOT/data && \
    chown node:node -R $SRV_DATA_ROOT

    
WORKDIR $SRV_DATA_ROOT
USER node

COPY --chown=node:node ./apps/web/package.json ./apps/web/playwright.config.ts ./apps/web/

COPY --chown=node:node ./apps/worker/package.json ./apps/worker/

COPY --chown=node:node ./packages ./packages

COPY --chown=node:node ./yarn.lock ./package.json ./


# playwright needs root permissions to install a few deb packages
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    --mount=type=cache,uid=1000,gid=1000,sharing=locked,target=/home/node/.cache/yarn/ \
    --mount=type=cache,uid=1000,gid=1000,target=/home/node/.npm \
    set -eux && \
    yarn install --network-timeout 10000000


# Copy the rest and build it
COPY --chown=node:node . .

RUN --mount=type=cache,uid=1000,gid=1000,sharing=locked,target=/home/node/.cache/yarn/ \
    --mount=type=cache,uid=1000,gid=1000,target=/home/node/.npm \
    yarn prisma:generate && \
    yarn web:build

HEALTHCHECK --interval=30s \
            --timeout=5s \
            --start-period=10s \
            --retries=3 \
            CMD [ "/usr/bin/curl", "--silent", "--fail", "http://127.0.0.1:3000/" ]

EXPOSE 3000

# Switch back to root to adjust permissions in docker-entrypoint.sh
# docker-entrypoint.sh will switch process to node:node or PUID:PGID
USER root

# Remove sudo, just in case
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    set -eux && \
    sed -i '/%sudo ALL=(ALL) NOPASSWD:ALL/d' /etc/sudoers && \
    deluser node sudo && \
    export SUDO_FORCE_REMOVE=yes && \
    apt-get remove -yq \
        sudo

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["sh", "-c", "yarn prisma:deploy && yarn concurrently:start"]

