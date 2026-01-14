using AIPersonalAssistantWithHindsight.Models;
using Azure.AI.OpenAI;
using Azure.Identity;
using Microsoft.Agents.AI;
using OpenAI.Chat;

namespace AIPersonalAssistantWithHindsight.Services;

public class PersonalAssistantService : IPersonalAssistantService
{
    public async Task<ChatResponse> ChatAsync(ChatRequest request)
    {
        AIAgent agent = new AzureOpenAIClient(
        new Uri("https://testmediumazureopenai.openai.azure.com/"),
        new AzureCliCredential())
            .GetChatClient("gpt-5-mini")
            .CreateAIAgent(instructions: "You are helpful AI personal assistant.");

        var airesponse = await agent.RunAsync(request.Message);

        var response = new ChatResponse
        {
            Message = airesponse.ToString(),
            UserId = request.UserId,
            Timestamp = DateTime.UtcNow
        };
        
        return response;
    }
}
