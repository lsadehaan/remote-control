# Rust Development Container
# Full Rust environment with AI CLI tools
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Essential packages
RUN apt-get update && apt-get install -y \
    curl wget git vim nano htop tree jq unzip zip tar gzip \
    ca-certificates gnupg lsb-release software-properties-common \
    build-essential cmake pkg-config autoconf automake libtool \
    openssh-client netcat-openbsd dnsutils iputils-ping \
    libssl-dev libffi-dev zlib1g-dev \
    bash-completion tmux screen \
    && rm -rf /var/lib/apt/lists/*

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Add common targets
RUN rustup target add \
    x86_64-unknown-linux-musl \
    wasm32-unknown-unknown \
    wasm32-wasi

# Install common components
RUN rustup component add \
    rust-src \
    rust-analyzer \
    clippy \
    rustfmt

# Install common Cargo tools
RUN cargo install \
    cargo-watch \
    cargo-edit \
    cargo-outdated \
    cargo-audit \
    cargo-expand \
    cargo-make \
    cargo-nextest \
    sccache \
    tokei \
    ripgrep \
    fd-find \
    bat \
    eza

ENV RUSTC_WRAPPER=sccache

# Install Node.js for AI CLIs
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install AI CLI tools
RUN npm install -g \
    @anthropic-ai/claude-code \
    @openai/codex-cli \
    && npm cache clean --force

# Create config directories
RUN mkdir -p /root/.config/claude /root/.config/codex

# Git configuration
RUN git config --global init.defaultBranch main \
    && git config --global core.editor vim

WORKDIR /workspace

CMD ["/bin/bash"]
