# Rust Build Image
FROM rust:1.71-slim as rust-builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libasound2-dev \
    libudev-dev \
    libwayland-dev \
    libx11-dev \
    libxkbcommon-dev \
    cmake \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install cargo-watch for development
RUN cargo install cargo-watch

# Working directory
WORKDIR /project

# Build script
COPY rust-build.sh /usr/local/bin/rust-build
RUN chmod +x /usr/local/bin/rust-build

# Default command
ENTRYPOINT ["rust-build"]