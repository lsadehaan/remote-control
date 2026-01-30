# Node.js Development Container
# Full Node.js environment with AI CLI tools
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

# Install Node.js 22.x LTS
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm and yarn
RUN corepack enable \
    && corepack prepare pnpm@9.15.0 --activate \
    && npm install -g yarn

# Install common Node.js global tools
RUN npm install -g \
    typescript \
    ts-node \
    tsx \
    eslint \
    prettier \
    nodemon \
    pm2 \
    serve \
    http-server \
    vercel \
    wrangler

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# Install Deno
RUN curl -fsSL https://deno.land/install.sh | sh
ENV PATH="/root/.deno/bin:${PATH}"

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
