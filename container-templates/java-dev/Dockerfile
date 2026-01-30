# Java Development Container
# Full Java environment with AI CLI tools
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
    bash-completion tmux screen ant \
    && rm -rf /var/lib/apt/lists/*

# Install SDKMAN and Java
RUN curl -s "https://get.sdkman.io" | bash
SHELL ["/bin/bash", "-c"]

# Install Java versions and tools via SDKMAN
RUN source "/root/.sdkman/bin/sdkman-init.sh" \
    && sdk install java 21-tem \
    && sdk install java 17-tem \
    && sdk default java 21-tem \
    && sdk install gradle \
    && sdk install maven \
    && sdk install kotlin

ENV JAVA_HOME=/root/.sdkman/candidates/java/current
ENV PATH="${PATH}:/root/.sdkman/candidates/java/current/bin:/root/.sdkman/candidates/gradle/current/bin:/root/.sdkman/candidates/maven/current/bin:/root/.sdkman/candidates/kotlin/current/bin"

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
