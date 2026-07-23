using MongoDB.Driver;

namespace Backend.Authentication;

// User Repository

public interface IUserRepository
{
    Task<List<User>> GetAllUsersAsync();
    Task<User?> GetUserByIdAsync(string id);
    Task<User?> GetUserByUserNameAsync(string userName);
    Task<User?> GetUserByEmailAsync(string email);
    Task<User> CreateUserAsync(User user);
    Task<bool> UpdateUserAsync(string id, User user);
    Task<bool> DeleteUserAsync(string id);
    Task<bool> UserNameExistsAsync(string userName);
    Task<bool> EmailExistsAsync(string email);
    Task<bool> UpdateFailedLoginAttemptsAsync(string id, int attempts);
    Task<bool> UpdateLastLoginAsync(string id, DateTime lastLogin);
    Task<bool> UpdateLockoutEndTimeAsync(string id, DateTime? lockoutEndTime);
    Task<bool> ResetFailedLoginAttemptsAsync(string id);
}

public class UserRepository : IUserRepository
{
    private readonly IMongoCollection<User> _users;

    public UserRepository(IMongoDatabase database)
    {
        _users = database.GetCollection<User>("users");
    }

    public async Task<List<User>> GetAllUsersAsync()
    {
        return await _users.Find(_ => true)
            .SortBy(u => u.UserName)
            .ToListAsync();
    }

    public async Task<User?> GetUserByIdAsync(string id)
    {
        return await _users.Find(u => u.Id == id).FirstOrDefaultAsync();
    }

    public async Task<User?> GetUserByUserNameAsync(string userName)
    {
        return await _users.Find(u => u.UserName == userName).FirstOrDefaultAsync();
    }

    public async Task<User?> GetUserByEmailAsync(string email)
    {
        return await _users.Find(u => u.Email == email).FirstOrDefaultAsync();
    }

    public async Task<User> CreateUserAsync(User user)
    {
        await _users.InsertOneAsync(user);
        return user;
    }

    public async Task<bool> UpdateUserAsync(string id, User user)
    {
        var result = await _users.ReplaceOneAsync(u => u.Id == id, user);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> DeleteUserAsync(string id)
    {
        var result = await _users.DeleteOneAsync(u => u.Id == id);
        return result.DeletedCount > 0;
    }

    public async Task<bool> UserNameExistsAsync(string userName)
    {
        return await _users.Find(u => u.UserName == userName).AnyAsync();
    }

    public async Task<bool> EmailExistsAsync(string email)
    {
        return await _users.Find(u => u.Email == email).AnyAsync();
    }

    public async Task<bool> UpdateFailedLoginAttemptsAsync(string id, int attempts)
    {
        var update = Builders<User>.Update.Set(u => u.FailedLoginAttempts, attempts);
        var result = await _users.UpdateOneAsync(u => u.Id == id, update);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> UpdateLastLoginAsync(string id, DateTime lastLogin)
    {
        var update = Builders<User>.Update.Set(u => u.LastLogin, lastLogin);
        var result = await _users.UpdateOneAsync(u => u.Id == id, update);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> UpdateLockoutEndTimeAsync(string id, DateTime? lockoutEndTime)
    {
        var update = Builders<User>.Update.Set(u => u.LockoutEndTime, lockoutEndTime);
        var result = await _users.UpdateOneAsync(u => u.Id == id, update);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> ResetFailedLoginAttemptsAsync(string id)
    {
        var update = Builders<User>.Update
            .Set(u => u.FailedLoginAttempts, 0)
            .Set(u => u.LockoutEndTime, null);
        var result = await _users.UpdateOneAsync(u => u.Id == id, update);
        return result.ModifiedCount > 0;
    }
}

// RefreshToken Repository

public interface IRefreshTokenRepository
{
    Task<RefreshToken?> GetRefreshTokenAsync(string token);
    Task<List<RefreshToken>> GetUserRefreshTokensAsync(string userId);
    Task<RefreshToken> CreateRefreshTokenAsync(RefreshToken refreshToken);
    Task<bool> RevokeRefreshTokenAsync(string token, string? replacedByToken = null);
    Task<bool> RevokeAllUserTokensAsync(string userId);
    Task DeleteExpiredTokensAsync();
}

public class RefreshTokenRepository : IRefreshTokenRepository
{
    private readonly IMongoCollection<RefreshToken> _refreshTokens;

    public RefreshTokenRepository(IMongoDatabase database)
    {
        _refreshTokens = database.GetCollection<RefreshToken>("refreshTokens");
    }

    public async Task<RefreshToken?> GetRefreshTokenAsync(string token)
    {
        return await _refreshTokens.Find(rt => rt.Token == token).FirstOrDefaultAsync();
    }

    public async Task<List<RefreshToken>> GetUserRefreshTokensAsync(string userId)
    {
        return await _refreshTokens.Find(rt => rt.UserId == userId)
            .SortByDescending(rt => rt.Created)
            .ToListAsync();
    }

    public async Task<RefreshToken> CreateRefreshTokenAsync(RefreshToken refreshToken)
    {
        await _refreshTokens.InsertOneAsync(refreshToken);
        return refreshToken;
    }

    public async Task<bool> RevokeRefreshTokenAsync(string token, string? replacedByToken = null)
    {
        var update = Builders<RefreshToken>.Update
            .Set(rt => rt.Revoked, DateTime.UtcNow);

        if (replacedByToken != null)
        {
            update = update.Set(rt => rt.ReplacedByToken, replacedByToken);
        }

        var result = await _refreshTokens.UpdateOneAsync(rt => rt.Token == token, update);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> RevokeAllUserTokensAsync(string userId)
    {
        var update = Builders<RefreshToken>.Update.Set(rt => rt.Revoked, DateTime.UtcNow);
        var result = await _refreshTokens.UpdateManyAsync(
            rt => rt.UserId == userId && rt.Revoked == null,
            update);
        return result.ModifiedCount > 0;
    }

    public async Task DeleteExpiredTokensAsync()
    {
        await _refreshTokens.DeleteManyAsync(rt => rt.Expires < DateTime.UtcNow);
    }
}
