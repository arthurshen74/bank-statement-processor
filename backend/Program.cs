using Backend.CategoryClassification;
using Backend.CategoryManagement;
using Backend.Common;
using Backend.TransactionReporting;
using Backend.TransactionCategorization;
using Backend.ReceiptManagement;
using Backend.NamingRules;
using Backend.Authentication;
using Backend.Authorization;
using Backend.Statements;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;
using System.Security.Cryptography;

// Register MongoDB serializers
BsonSerializer.RegisterSerializer(new EnumMemberSerializer<CategoryType>());

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddOpenApi();

// Add MongoDB repositories and services
builder.Services.AddSingleton<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<ICategoryService, CategoryService>();

builder.Services.AddSingleton<ICategoryRuleRepository, CategoryRuleRepository>();
builder.Services.AddScoped<ICategoryRuleService, CategoryRuleService>();

builder.Services.AddSingleton<INamingRuleRepository, NamingRuleRepository>();
builder.Services.AddScoped<INamingRuleService, NamingRuleService>();

builder.Services.AddSingleton<ITransactionReportRepository, TransactionReportRepository>();
builder.Services.AddSingleton<ILinkedTransactionRepository, LinkedTransactionRepository>();
builder.Services.AddScoped<ITransactionReportService, TransactionReportService>();

builder.Services.AddSingleton<ITransactionCategorizationRepository, TransactionCategorizationRepository>();
builder.Services.AddScoped<ITransactionCategorizationService, TransactionCategorizationService>();
builder.Services.AddHttpClient<IPatternGeneratorService, PatternGeneratorService>();

// Register MongoDB database for GridFS
builder.Services.AddSingleton<IMongoDatabase>(sp =>
{
    var configuration = sp.GetRequiredService<IConfiguration>();
    var connectionUri = configuration["MongoDB:ConnectionString"];
    var settings = MongoClientSettings.FromConnectionString(connectionUri);
    settings.ServerApi = new ServerApi(ServerApiVersion.V1);
    var client = new MongoClient(settings);
    return client.GetDatabase(configuration["MongoDB:DatabaseName"]);
});

// Add Receipt management services
builder.Services.AddScoped<IReceiptRepository, ReceiptRepository>();
builder.Services.AddScoped<ReceiptService>();

// Add Statement services
builder.Services.AddSingleton<IStatementRepository, StatementRepository>();
builder.Services.AddScoped<IStatementService, StatementService>();

// Add Authentication services
builder.Services.AddSingleton<IUserRepository, UserRepository>();
builder.Services.AddSingleton<IRefreshTokenRepository, RefreshTokenRepository>();
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IAuthenticationService, AuthenticationService>();
builder.Services.AddScoped<IUserService, UserService>();

// Add Authentication & Authorization
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var publicKeyPath = builder.Configuration["Jwt:PublicKeyPath"];
        if (string.IsNullOrEmpty(publicKeyPath))
        {
            throw new InvalidOperationException("JWT PublicKeyPath is not configured");
        }

        var publicKeyPem = File.ReadAllText(publicKeyPath);
        var rsa = RSA.Create();
        rsa.ImportFromPem(publicKeyPem);

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new RsaSecurityKey(rsa),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(AuthorizationPolicies.AllRoles, policy =>
        policy.RequireRole(Roles.Admin, Roles.ReadWrite, Roles.ReadOnly));

    options.AddPolicy(AuthorizationPolicies.AdminOnly, policy =>
        policy.RequireRole(Roles.Admin));
});

// Add CORS (only needed for development when using Vite dev server).
// Origins come from configuration so the webapp port can be changed without a
// rebuild; the historical default is kept as the fallback.
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>();

if (allowedOrigins is null || allowedOrigins.Length == 0)
{
    allowedOrigins = new[] { "http://localhost:5173" };
}

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Enable CORS only in development (for Vite dev server)
if (app.Environment.IsDevelopment())
{
    app.UseCors();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

// Serve static files from wwwroot (Vite build output)
app.UseStaticFiles();

// Add Authentication & Authorization middleware
app.UseAuthentication();
app.UseAuthorization();

// Map API endpoints
app.MapCategoryRuleEndpoints();
app.MapCategoryEndpoints();
app.MapNamingRuleEndpoints();
app.MapTransactionReportEndpoints();
app.MapTransactionCategorizationEndpoints();
app.MapReceiptEndpoints();
app.MapAuthenticationEndpoints();
app.MapUserEndpoints();
app.MapStatementEndpoints();

// SPA fallback - serve index.html for all other routes (so React Router works)
app.MapFallbackToFile("index.html");

app.Run();
