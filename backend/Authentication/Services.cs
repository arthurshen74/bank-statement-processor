using MongoDB.Bson;
using BCrypt.Net;

namespace Backend.Authentication;

// Authentication Service

public interface IAuthenticationService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request);
    Task<RefreshTokenResponse?> RefreshTokenAsync(RefreshTokenRequest request);
    Task<bool> RevokeTokenAsync(string token);
}

public class AuthenticationService : IAuthenticationService
{
    private readonly IUserRepository _userRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IConfiguration _configuration;
    private readonly int _maxFailedLoginAttempts;
    private readonly int _lockoutDurationMinutes;
    private readonly int _refreshTokenExpirationMinutes;

    public AuthenticationService(
        IUserRepository userRepository,
        IRefreshTokenRepository refreshTokenRepository,
        IJwtTokenService jwtTokenService,
        IConfiguration configuration)
    {
        _userRepository = userRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _jwtTokenService = jwtTokenService;
        _configuration = configuration;
        _maxFailedLoginAttempts = int.Parse(_configuration["Authentication:MaxFailedLoginAttempts"] ?? "3");
        _lockoutDurationMinutes = int.Parse(_configuration["Authentication:LockoutDurationMinutes"] ?? "30");
        _refreshTokenExpirationMinutes = int.Parse(_configuration["Jwt:RefreshTokenExpirationMinutes"] ?? "1440");
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var user = await _userRepository.GetUserByUserNameAsync(request.UserName);

        if (user == null)
        {
            return null;
        }

        // Check if user is locked out
        if (user.LockoutEndTime.HasValue && user.LockoutEndTime.Value > DateTime.UtcNow)
        {
            throw new InvalidOperationException($"Account is locked. Try again after {user.LockoutEndTime.Value:yyyy-MM-dd HH:mm:ss} UTC");
        }

        // Clear lockout if expired
        if (user.LockoutEndTime.HasValue && user.LockoutEndTime.Value <= DateTime.UtcNow)
        {
            await _userRepository.UpdateLockoutEndTimeAsync(user.Id, null);
            user.LockoutEndTime = null;
        }

        // Check if user is active
        if (!user.IsActive)
        {
            throw new InvalidOperationException("Account is inactive. Please contact an administrator.");
        }

        // Verify password
        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            // Increment failed login attempts
            var newFailedAttempts = user.FailedLoginAttempts + 1;
            await _userRepository.UpdateFailedLoginAttemptsAsync(user.Id, newFailedAttempts);

            // Lock account if max attempts exceeded
            if (newFailedAttempts >= _maxFailedLoginAttempts)
            {
                var lockoutEndTime = DateTime.UtcNow.AddMinutes(_lockoutDurationMinutes);
                await _userRepository.UpdateLockoutEndTimeAsync(user.Id, lockoutEndTime);
                throw new InvalidOperationException($"Account locked due to multiple failed login attempts. Try again after {_lockoutDurationMinutes} minutes.");
            }

            return null;
        }

        // Successful login - reset failed attempts and update last login
        await _userRepository.ResetFailedLoginAttemptsAsync(user.Id);
        await _userRepository.UpdateLastLoginAsync(user.Id, DateTime.UtcNow);
        user.FailedLoginAttempts = 0;
        user.LastLogin = DateTime.UtcNow;
        user.LockoutEndTime = null;

        // Generate tokens
        var accessToken = _jwtTokenService.GenerateAccessToken(user);
        var refreshTokenString = _jwtTokenService.GenerateRefreshToken();

        // Store refresh token
        var refreshToken = new RefreshToken
        {
            Id = ObjectId.GenerateNewId().ToString(),
            UserId = user.Id,
            Token = refreshTokenString,
            Created = DateTime.UtcNow,
            Expires = DateTime.UtcNow.AddMinutes(_refreshTokenExpirationMinutes)
        };

        await _refreshTokenRepository.CreateRefreshTokenAsync(refreshToken);

        return new LoginResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshTokenString,
            ExpiresAt = refreshToken.Expires
        };
    }

    public async Task<RefreshTokenResponse?> RefreshTokenAsync(RefreshTokenRequest request)
    {
        var refreshToken = await _refreshTokenRepository.GetRefreshTokenAsync(request.RefreshToken);

        if (refreshToken == null || !refreshToken.IsActive)
        {
            return null;
        }

        // Get user
        var user = await _userRepository.GetUserByIdAsync(refreshToken.UserId);
        if (user == null || !user.IsActive)
        {
            return null;
        }

        // Generate new tokens
        var newAccessToken = _jwtTokenService.GenerateAccessToken(user);
        var newRefreshTokenString = _jwtTokenService.GenerateRefreshToken();

        // Create new refresh token
        var newRefreshToken = new RefreshToken
        {
            Id = ObjectId.GenerateNewId().ToString(),
            UserId = user.Id,
            Token = newRefreshTokenString,
            Created = DateTime.UtcNow,
            Expires = DateTime.UtcNow.AddMinutes(_refreshTokenExpirationMinutes)
        };

        await _refreshTokenRepository.CreateRefreshTokenAsync(newRefreshToken);

        // Revoke old refresh token
        await _refreshTokenRepository.RevokeRefreshTokenAsync(refreshToken.Token, newRefreshToken.Id);

        return new RefreshTokenResponse
        {
            AccessToken = newAccessToken,
            RefreshToken = newRefreshTokenString,
            ExpiresAt = newRefreshToken.Expires
        };
    }

    public async Task<bool> RevokeTokenAsync(string token)
    {
        return await _refreshTokenRepository.RevokeRefreshTokenAsync(token);
    }
}

// User Service

public interface IUserService
{
    Task<List<UserDto>> GetAllUsersAsync();
    Task<UserDto?> GetUserByIdAsync(string id);
    Task<UserDto> CreateUserAsync(CreateUserRequest request);
    Task<UserDto?> UpdateUserAsync(string id, UpdateUserRequest request);
    Task<bool> DeleteUserAsync(string id);
}

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;

    public UserService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<List<UserDto>> GetAllUsersAsync()
    {
        var users = await _userRepository.GetAllUsersAsync();
        return users.ToDto();
    }

    public async Task<UserDto?> GetUserByIdAsync(string id)
    {
        var user = await _userRepository.GetUserByIdAsync(id);
        return user?.ToDto();
    }

    public async Task<UserDto> CreateUserAsync(CreateUserRequest request)
    {
        // Validate password
        var (isValid, errorMessage) = PasswordValidator.Validate(request.Password);
        if (!isValid)
        {
            throw new InvalidOperationException(errorMessage!);
        }

        // Check if username already exists
        if (await _userRepository.UserNameExistsAsync(request.UserName))
        {
            throw new InvalidOperationException($"Username '{request.UserName}' already exists");
        }

        // Check if email already exists
        if (await _userRepository.EmailExistsAsync(request.Email))
        {
            throw new InvalidOperationException($"Email '{request.Email}' already exists");
        }

        // Create user
        var user = new User
        {
            Id = ObjectId.GenerateNewId().ToString(),
            UserName = request.UserName,
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            Roles = request.Roles,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            IsActive = true,
            FailedLoginAttempts = 0,
            CreatedDate = DateTime.UtcNow
        };

        var created = await _userRepository.CreateUserAsync(user);
        return created.ToDto();
    }

    public async Task<UserDto?> UpdateUserAsync(string id, UpdateUserRequest request)
    {
        var user = await _userRepository.GetUserByIdAsync(id);
        if (user == null)
        {
            return null;
        }

        // Check if email is being changed and if it already exists
        if (user.Email != request.Email && await _userRepository.EmailExistsAsync(request.Email))
        {
            throw new InvalidOperationException($"Email '{request.Email}' already exists");
        }

        // Update user fields
        user.FirstName = request.FirstName;
        user.LastName = request.LastName;
        user.Email = request.Email;
        user.Roles = request.Roles;
        user.IsActive = request.IsActive;
        user.FailedLoginAttempts = request.FailedLoginAttempts;

        // Update password if provided
        if (!string.IsNullOrWhiteSpace(request.NewPassword))
        {
            var (isValid, errorMessage) = PasswordValidator.Validate(request.NewPassword);
            if (!isValid)
            {
                throw new InvalidOperationException(errorMessage!);
            }
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        }

        // Reset lockout if failed attempts is reset to 0
        if (request.FailedLoginAttempts == 0 && user.LockoutEndTime.HasValue)
        {
            user.LockoutEndTime = null;
        }

        var updated = await _userRepository.UpdateUserAsync(id, user);
        return updated ? user.ToDto() : null;
    }

    public async Task<bool> DeleteUserAsync(string id)
    {
        return await _userRepository.DeleteUserAsync(id);
    }
}
