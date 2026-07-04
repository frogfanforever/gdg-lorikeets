from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    model_config = SettingsConfigDict(
        env_file="../.env",
        env_ignore_empty=True,
        extra="ignore",
    )

    # ==========================================
    # MCP Server
    # ==========================================
    MCP_HOST: str = "localhost"
    MCP_PORT: int = 8000

    # ==========================================
    # Embeddings (semantic search in pytriz)
    # Default OFF so the server runs standalone on Cloud Run (pytriz TRIZStore()
    # uses BM25 lexical search — zero config, no Ollama). Re-enable dense semantic
    # search by setting EMBEDDING_MODEL + EMBEDDING_SERVICE_URL to a live endpoint.
    # ==========================================
    EMBEDDING_MODEL: str = ""
    EMBEDDING_SERVICE_URL: str = "http://localhost:11434/v1"
    EMBEDDING_API_KEY: str = "ollama"


config = Config()
