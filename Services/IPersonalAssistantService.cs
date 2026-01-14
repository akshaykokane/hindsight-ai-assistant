using AIPersonalAssistantWithHindsight.Models;

namespace AIPersonalAssistantWithHindsight.Services;

public interface IPersonalAssistantService
{
    Task<ChatResponse> ChatAsync(ChatRequest request);
}
