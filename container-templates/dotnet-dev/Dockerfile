# .NET Development Container
# Full .NET environment with AI CLI tools
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

# Install .NET SDK 8.0
RUN wget https://packages.microsoft.com/config/ubuntu/24.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && rm packages-microsoft-prod.deb \
    && apt-get update \
    && apt-get install -y dotnet-sdk-8.0 aspnetcore-runtime-8.0 \
    && rm -rf /var/lib/apt/lists/*

# Install .NET tools
RUN dotnet tool install --global dotnet-ef \
    && dotnet tool install --global dotnet-format \
    && dotnet tool install --global dotnet-outdated-tool \
    && dotnet tool install --global dotnet-reportgenerator-globaltool
ENV PATH="${PATH}:/root/.dotnet/tools"

# Install PowerShell
RUN apt-get update \
    && apt-get install -y powershell \
    && rm -rf /var/lib/apt/lists/*

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
