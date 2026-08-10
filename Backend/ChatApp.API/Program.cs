using ChatApp.API.Hubs;
using ChatApp.API.Repositories;
using ChatApp.API.Services;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

// Register services (SOLID: each interface has a single responsibility)
builder.Services.AddSingleton<IPasswordService, PasswordService>();
builder.Services.AddSingleton<IRateLimitService, RateLimitService>();
builder.Services.AddSingleton<IUserRepository, InMemoryUserRepository>();
builder.Services.AddSingleton<IMessageRepository, InMemoryMessageRepository>();
builder.Services.AddSingleton<IAuthenticationService, AuthenticationService>();

builder.Services.AddControllers();
builder.Services.AddSignalR();

// Configure Forwarded Headers for reverse proxy deployment (Railway, Render, Fly.io, etc.)
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// Configure CORS to allow frontend origin with credentials (cookies / SignalR)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseForwardedHeaders();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Serve static frontend files if present in wwwroot
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseRouting();
app.UseCors("AllowReactApp");

app.UseAuthorization();

app.MapControllers();
app.MapHub<ChatHub>("/chathub");
app.MapFallbackToFile("index.html");

app.Run();