namespace Backend.Authorization;

public static class AuthorizationPolicies
{
    public const string AllRoles = "AllRoles";
    public const string AdminOnly = "AdminOnly";
}

public static class Roles
{
    public const string Admin = "Admin";
    public const string ReadWrite = "ReadWrite";
    public const string ReadOnly = "ReadOnly";
}
