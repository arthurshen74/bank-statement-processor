using Microsoft.AspNetCore.Authorization;

namespace Backend.Authentication;

public static class AuthenticationEndpoints
{
    public static void MapAuthenticationEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth")
            .WithTags("Authentication")
            .AllowAnonymous();

        group.MapPost("/login", Login);
        group.MapPost("/refresh", RefreshToken);
        group.MapPost("/revoke", RevokeToken);
    }

    private static async Task<IResult> Login(LoginRequest request, IAuthenticationService service)
    {
        try
        {
            var response = await service.LoginAsync(request);
            if (response == null)
            {
                return Results.BadRequest(new { error = "Invalid username or password" });
            }
            return Results.Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
    }

    private static async Task<IResult> RefreshToken(RefreshTokenRequest request, IAuthenticationService service)
    {
        var response = await service.RefreshTokenAsync(request);
        if (response == null)
        {
            return Results.BadRequest(new { error = "Invalid or expired refresh token" });
        }
        return Results.Ok(response);
    }

    private static async Task<IResult> RevokeToken(RefreshTokenRequest request, IAuthenticationService service)
    {
        var success = await service.RevokeTokenAsync(request.RefreshToken);
        if (!success)
        {
            return Results.NotFound(new { error = "Token not found" });
        }
        return Results.NoContent();
    }
}

public static class UserEndpoints
{
    public static void MapUserEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/users")
            .WithTags("Users")
            .RequireAuthorization(Backend.Authorization.AuthorizationPolicies.AdminOnly);

        group.MapGet("/", GetAll);
        group.MapGet("/{id}", GetById);
        group.MapPost("/", Create);
        group.MapPut("/{id}", Update);
        group.MapDelete("/{id}", Delete);
    }

    private static async Task<IResult> GetAll(IUserService service)
    {
        var users = await service.GetAllUsersAsync();
        return Results.Ok(users);
    }

    private static async Task<IResult> GetById(string id, IUserService service)
    {
        var user = await service.GetUserByIdAsync(id);
        return user is not null ? Results.Ok(user) : Results.NotFound();
    }

    private static async Task<IResult> Create(CreateUserRequest request, IUserService service)
    {
        try
        {
            var user = await service.CreateUserAsync(request);
            return Results.Created($"/api/users/{user.Id}", user);
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
    }

    private static async Task<IResult> Update(string id, UpdateUserRequest request, IUserService service)
    {
        try
        {
            var user = await service.UpdateUserAsync(id, request);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
    }

    private static async Task<IResult> Delete(string id, IUserService service)
    {
        var success = await service.DeleteUserAsync(id);
        return success ? Results.NoContent() : Results.NotFound();
    }
}
