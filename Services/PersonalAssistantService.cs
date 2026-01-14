using AIPersonalAssistantWithHindsight.Models;
using Azure.AI.OpenAI;
using Azure.Identity;
using Microsoft.Agents.AI;
using OpenAI.Chat;
using Microsoft.Extensions.AI;
using ModelContextProtocol.Client;
using ChatResponse = AIPersonalAssistantWithHindsight.Models.ChatResponse;

namespace AIPersonalAssistantWithHindsight.Services;

public class PersonalAssistantService : IPersonalAssistantService
{
    private static readonly Dictionary<string, AgentThread> _agentThreads = new();
    private static readonly SemaphoreSlim _initLock = new(1, 1);
    private static bool _initialized = false;
    private static AIAgent? _sharedAgent;
    private static string? _cachedSystemMessage;

    public PersonalAssistantService()
    {
    }

    public async Task<ChatResponse> ChatAsync(ChatRequest request)
    {
        // Initialize agent once on first request
        if (!_initialized)
        {
            await _initLock.WaitAsync();
            try
            {
                if (!_initialized)
                {
                    var clientTransport = new HttpClientTransport(new HttpClientTransportOptions
                    {
                        Endpoint = new Uri("http://localhost:8888/mcp/alice/"),
                    });

                    var mcpClient = await McpClient.CreateAsync(clientTransport);
                    var mcpTools = await mcpClient.ListToolsAsync().ConfigureAwait(false);

                    _sharedAgent = new AzureOpenAIClient(
                        new Uri("https://testmediumazureopenai.openai.azure.com/"),
                        new AzureCliCredential())
                            .GetChatClient("gpt-5-mini")
                            .CreateAIAgent(
                                instructions: GetSystemMessage(),
                                tools: [.. mcpTools.Cast<AITool>()]);

                    _initialized = true;
                }
            }
            finally
            {
                _initLock.Release();
            }
        }

        AgentThread thread = GetOrCreateAgentThread(request.SessionId, _sharedAgent!);

        var airesponse = await _sharedAgent!.RunAsync(request.Message, thread);

        var response = new ChatResponse
        {
            Message = airesponse.ToString(),
            UserId = request.UserId,
            Timestamp = DateTime.UtcNow
        };
        
        return response;
    }

    private AgentThread GetOrCreateAgentThread(string sessionId, AIAgent agent)
    {
        if (!_agentThreads.ContainsKey(sessionId))
        {
            var thread = agent.GetNewThread();
            _agentThreads[sessionId] = thread;
        }

        return _agentThreads[sessionId];
    }

    private string GetSystemMessage()
    {
        if (_cachedSystemMessage == null)
        {
            _cachedSystemMessage = File.ReadAllText("system_message.txt");
        }
        return _cachedSystemMessage;
    }
}
