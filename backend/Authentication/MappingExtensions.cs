namespace Backend.Authentication;

public static class UserMappingExtensions
{
    public static UserDto ToDto(this User user) => new UserDto
    {
        Id = user.Id,
        UserName = user.UserName,
        FirstName = user.FirstName,
        LastName = user.LastName,
        Email = user.Email,
        Roles = user.Roles,
        IsActive = user.IsActive,
        FailedLoginAttempts = user.FailedLoginAttempts,
        LastLogin = user.LastLogin,
        LockoutEndTime = user.LockoutEndTime,
        CreatedDate = user.CreatedDate
    };

    public static List<UserDto> ToDto(this IEnumerable<User> users) =>
        users.Select(ToDto).ToList();

    public static RefreshTokenDto ToDto(this RefreshToken token) => new RefreshTokenDto
    {
        Id = token.Id,
        UserId = token.UserId,
        Created = token.Created,
        Expires = token.Expires,
        Revoked = token.Revoked,
        IsActive = token.IsActive
    };

    public static List<RefreshTokenDto> ToDto(this IEnumerable<RefreshToken> tokens) =>
        tokens.Select(ToDto).ToList();
}
