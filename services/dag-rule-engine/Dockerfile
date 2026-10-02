# Production Dockerfile for DAG Rule Engine using Astral uv
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

WORKDIR /app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1
ENV UV_SYSTEM_PYTHON=1

# Copy project manifest and install dependencies
COPY pyproject.toml ./
RUN uv pip install --no-cache -r <(uv pip compile pyproject.toml)

# Copy application source
COPY . .

EXPOSE 8001

CMD ["python", "main.py"]
