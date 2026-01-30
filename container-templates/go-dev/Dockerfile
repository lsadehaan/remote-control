# Go Development Container
# Full Go environment with AI CLI tools
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
    protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*

# Install Go
ENV GO_VERSION=1.23.4
RUN wget https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz \
    && rm go${GO_VERSION}.linux-amd64.tar.gz

ENV PATH="${PATH}:/usr/local/go/bin:/root/go/bin"
ENV GOPATH=/root/go

# Install common Go tools
RUN go install golang.org/x/tools/gopls@latest \
    && go install github.com/go-delve/delve/cmd/dlv@latest \
    && go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest \
    && go install github.com/cosmtrek/air@latest \
    && go install github.com/swaggo/swag/cmd/swag@latest \
    && go install google.golang.org/protobuf/cmd/protoc-gen-go@latest \
    && go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest \
    && go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest \
    && go install github.com/pressly/goose/v3/cmd/goose@latest

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
