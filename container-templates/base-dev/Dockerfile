# Base Development Container
# Full Ubuntu with common development tools + AI CLI tools
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Essential packages
RUN apt-get update && apt-get install -y \
    # Core utilities
    curl \
    wget \
    git \
    vim \
    nano \
    htop \
    tree \
    jq \
    unzip \
    zip \
    tar \
    gzip \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common \
    # Build essentials
    build-essential \
    cmake \
    pkg-config \
    autoconf \
    automake \
    libtool \
    # Network tools
    openssh-client \
    netcat-openbsd \
    dnsutils \
    iputils-ping \
    # Development libraries
    libssl-dev \
    libffi-dev \
    zlib1g-dev \
    # Shell utilities
    bash-completion \
    tmux \
    screen \
    # Process management
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 22.x (needed for AI CLIs)
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Install AI CLI tools
RUN npm install -g \
    @anthropic-ai/claude-code \
    @openai/codex-cli \
    && npm cache clean --force

# Create config directories for CLIs
RUN mkdir -p /root/.config/claude /root/.config/codex

# Git configuration
RUN git config --global init.defaultBranch main \
    && git config --global core.editor vim

# Set up workspace
WORKDIR /workspace

# Default shell
SHELL ["/bin/bash", "-c"]

CMD ["/bin/bash"]
