# Unity Build Image
FROM unityci/editor:2022.3.5f1-linux-il2cpp-2 as unity-builder

# Install additional dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    unzip \
    git \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Unity Hub CLI
RUN curl -fsSL https://hub.unity3d.com/linux/keys/public | gpg --dearmor -o /usr/share/keyrings/unity-hub-archive-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/unity-hub-archive-keyring.gpg] https://hub.unity3d.com/linux/repos/deb stable main" | tee /etc/apt/sources.list.d/unityhub.list \
    && apt-get update \
    && apt-get install -y unity-hub

# Unity Build Tools
COPY unity-build.sh /usr/local/bin/unity-build
RUN chmod +x /usr/local/bin/unity-build

# Working directory
WORKDIR /project

# Default command
ENTRYPOINT ["unity-build"]