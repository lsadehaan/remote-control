#!/bin/bash

# Build all container images
# Run from the container-templates directory

set -e

echo "================================================"
echo "Building Remote Control Development Images"
echo "Each image includes: Claude Code + Codex CLI"
echo "================================================"
echo ""

echo "[1/8] Building base development image..."
docker build -t remote-control/base-dev:latest ./base-dev

echo "[2/8] Building Node.js development image..."
docker build -t remote-control/nodejs-dev:latest ./nodejs-dev

echo "[3/8] Building Python development image..."
docker build -t remote-control/python-dev:latest ./python-dev

echo "[4/8] Building .NET development image..."
docker build -t remote-control/dotnet-dev:latest ./dotnet-dev

echo "[5/8] Building C++ development image..."
docker build -t remote-control/cpp-dev:latest ./cpp-dev

echo "[6/8] Building Rust development image..."
docker build -t remote-control/rust-dev:latest ./rust-dev

echo "[7/8] Building Go development image..."
docker build -t remote-control/go-dev:latest ./go-dev

echo "[8/8] Building Java development image..."
docker build -t remote-control/java-dev:latest ./java-dev

echo ""
echo "================================================"
echo "All images built successfully!"
echo ""
echo "Each container includes:"
echo "  - Full development environment for the language"
echo "  - Claude Code CLI (run: claude)"
echo "  - Codex CLI (run: codex)"
echo "  - Common dev tools (git, vim, tmux, etc.)"
echo ""
echo "Available images:"
docker images | grep "remote-control/"
echo "================================================"
