FROM debian:buster-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV DEBIAN_VERSION=10

RUN apt-get update && apt-get --no-install-recommends install -y build-essential \
  ca-certificates \
  curl \
  wget \
  gnupg \
  git \
  vim \
  lsb-release \
  && apt-get clean 

RUN wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.asc.gpg
RUN mv microsoft.asc.gpg /etc/apt/trusted.gpg.d/
RUN wget -q https://packages.microsoft.com/config/debian/"$DEBIAN_VERSION"/prod.list
RUN mv prod.list /etc/apt/sources.list.d/microsoft-prod.list
RUN chown root:root /etc/apt/trusted.gpg.d/microsoft.asc.gpg
RUN chown root:root /etc/apt/sources.list.d/microsoft-prod.list

RUN curl -sL https://deb.nodesource.com/setup_18.x | bash -

RUN apt-get update && apt-get --no-install-recommends install -y build-essential \
  azure-functions-core-tools-4 \
  dotnet-sdk-3.1 \
  nodejs \
  && apt-get clean 

RUN groupadd -g 1000 dev && \
    adduser --uid 1000 --gid 1000 --disabled-password dev

RUN mkdir -p /opt/ohana
COPY --chown=dev:dev . /opt/ohana

WORKDIR /opt/ohana

RUN npm install --workspaces --ignore-scripts
USER dev

WORKDIR /opt/ohana/azure-functions
CMD func start --build --javascript