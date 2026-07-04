from mcp.server.fastmcp import FastMCP

from app.tools.scamper import apply_lens, list_scamper_lenses, scamper_ideate

tools = [list_scamper_lenses, apply_lens, scamper_ideate]


def register(mcp: FastMCP) -> None:
    for tool in tools:
        mcp.tool()(tool)
