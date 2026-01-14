using Microsoft.AspNetCore.Mvc;
using AIPersonalAssistantWithHindsight.Services;
using AIPersonalAssistantWithHindsight.Models;

namespace AIPersonalAssistantWithHindsight.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly IPersonalAssistantService _personalAssistantService;

    public ChatController(IPersonalAssistantService personalAssistantService)
    {
        _personalAssistantService = personalAssistantService;
    }

    [HttpPost]
    public async Task<IActionResult> Chat([FromBody] ChatRequest request)
    {
        if (string.IsNullOrWhiteSpace(request?.Message))
        {
            return BadRequest(new { error = "Message is required" });
        }

        if (string.IsNullOrWhiteSpace(request?.UserId))
        {
            return BadRequest(new { error = "UserId is required" });
        }

        var response = await _personalAssistantService.ChatAsync(request);
        return Ok(response);
    }
}
