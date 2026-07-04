from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        extra="ignore",
    )

    # ==========================================
    # MCP Server
    # ==========================================
    MCP_HOST: str = "localhost"
    MCP_PORT: int = 8000

    # ==========================================
    # LLM — Gemini via its OpenAI-compatible endpoint.
    # Set SCAMPER_LLM_API_KEY via env (Cloud Run); empty → deterministic stub so the
    # server still runs offline / without a key.
    # ==========================================
    SCAMPER_LLM_MODEL: str = "gemini-2.5-flash"
    SCAMPER_LLM_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta/openai"
    SCAMPER_LLM_API_KEY: str = ""


config = Config()
