namespace Backend.Authentication;

public static class PasswordValidator
{
    private const int MinimumLength = 8;

    public static (bool IsValid, string? ErrorMessage) Validate(string password)
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            return (false, "Password cannot be empty");
        }

        if (password.Length < MinimumLength)
        {
            return (false, $"Password must be at least {MinimumLength} characters long");
        }

        bool hasLetter = password.Any(char.IsLetter);
        bool hasDigit = password.Any(char.IsDigit);

        if (!hasLetter)
        {
            return (false, "Password must contain at least one letter");
        }

        if (!hasDigit)
        {
            return (false, "Password must contain at least one number");
        }

        return (true, null);
    }

    public static string GetRequirements()
    {
        return $"Password must be at least {MinimumLength} characters long and contain at least one letter and one number";
    }
}
