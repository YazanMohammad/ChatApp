FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["Backend/ChatApp.API/ChatApp.API.csproj", "Backend/ChatApp.API/"]
RUN dotnet restore "Backend/ChatApp.API/ChatApp.API.csproj"
COPY . .
WORKDIR "/src/Backend/ChatApp.API"
RUN dotnet publish "ChatApp.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "ChatApp.API.dll"]
