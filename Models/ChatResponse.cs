namespace AIPersonalAssistantWithHindsight.Models;

public class ChatResponse
{
    public string Message { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
