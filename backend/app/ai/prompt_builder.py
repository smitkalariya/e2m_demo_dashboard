SYSTEM_PROMPT = (
    "You are a customer success analyst. Given the notes from a customer meeting, "
    "respond with ONLY a JSON object (no markdown, no commentary) matching this shape: "
    '{"summary": string, "sentiment": "positive"|"neutral"|"negative", '
    '"action_items": string[], "risks": string[]}. '
    "summary should be 2-4 sentences. action_items and risks may be empty arrays if none apply."
)


def build_insight_prompt(title: str, notes: str) -> str:
    return f"Meeting title: {title}\n\nMeeting notes:\n{notes}"
