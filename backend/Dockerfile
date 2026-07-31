# SDK image rather than runtime: dotnet watch needs the full SDK.
FROM mcr.microsoft.com/dotnet/sdk:9.0

WORKDIR /src

# Restore as its own layer so source edits do not re-download packages.
COPY backend.csproj .
RUN dotnet restore

COPY . .

# Docker Desktop bind mounts do not propagate inotify events, so the default
# file watcher silently never fires. Polling is the only thing that works here.
ENV DOTNET_USE_POLLING_FILE_WATCHER=1
ENV DOTNET_WATCH_SUPPRESS_LAUNCH_BROWSER=1

EXPOSE 5201

# --no-launch-profile is required: Properties/launchSettings.json declares an
# https profile on :7201, and without this flag dotnet watch picks it up and
# fails trying to bind a dev certificate that does not exist in the container.
# The bind address comes from ASPNETCORE_URLS, set by compose from .env.
CMD ["dotnet", "watch", "run", "--no-launch-profile"]
