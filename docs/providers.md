# Providers & models

Inkling talks to language models through pluggable providers. Configure them
interactively on first run, or set environment variables directly. Persistent
settings live in `~/.inkling/.env`; anything in your shell environment takes
precedence.

## Selecting a provider

| Env var            | Purpose                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| `INKLING_PROVIDER` | `openrouter`, `ollama`, `baseten`, `fireworks`, `openai`, `openai-compatible`, or `anthropic`. |
| `INKLING_MODEL_ID` | Model ID for the selected provider.                                                            |

If `INKLING_PROVIDER` is unset, Inkling uses `openrouter` when an
`OPENROUTER_API_KEY` is present, otherwise it defaults to `openrouter` and
prompts for a key.

## OpenRouter (default)

```bash
INKLING_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-...
INKLING_MODEL_ID=z-ai/glm-5.2
```

OpenRouter runs try the selected model first and fall back to a couple of
alternates on transient server errors.

## Ollama (local, free, no API key)

Run a model entirely on your machine with [Ollama](https://ollama.com). No API
key is required.

```sh
ollama pull qwen2.5-coder:7b
```

```bash
INKLING_PROVIDER=ollama
INKLING_MODEL_ID=qwen2.5-coder:7b
# optional — defaults to http://localhost:11434/v1
OLLAMA_BASE_URL=http://localhost:11434/v1
```

Any model you have pulled locally can be used as the model ID. Larger models
produce better documentation; `qwen2.5-coder` and `llama3.1` are good starting
points.

## Anthropic

```bash
INKLING_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
INKLING_MODEL_ID=claude-sonnet-5
# optional: route through a proxy/gateway
ANTHROPIC_BASE_URL=https://your-gateway.example.com/anthropic
```

## OpenAI

```bash
INKLING_PROVIDER=openai
OPENAI_API_KEY=sk-...
INKLING_MODEL_ID=gpt-5.5
```

## OpenAI-compatible gateways

Target any OpenAI-compatible chat-completions endpoint (for example a LiteLLM
gateway). A base URL is required.

```bash
INKLING_PROVIDER=openai-compatible
OPENAI_COMPATIBLE_API_KEY=your-gateway-key
OPENAI_COMPATIBLE_BASE_URL=https://your-gateway.example.com/v1
INKLING_MODEL_ID=your-gateway-model-name
```

## Baseten and Fireworks

```bash
INKLING_PROVIDER=baseten
BASETEN_API_KEY=...
INKLING_MODEL_ID=zai-org/GLM-5.2
```

```bash
INKLING_PROVIDER=fireworks
FIREWORKS_API_KEY=...
INKLING_MODEL_ID=accounts/fireworks/models/glm-5p2
```

## Per-run model override

Any run can override the configured model without changing your saved settings:

```sh
inkling --update --modelId gpt-5.5
```

## Optional tracing (LangSmith)

Set a LangSmith key to trace runs to a project named `inkling`:

```bash
LANGSMITH_API_KEY=ls-...
LANGCHAIN_PROJECT=inkling
LANGCHAIN_TRACING_V2=true
```

## Adding a provider

Providers are defined in [`src/constants.ts`](../src/constants.ts)
(`PROVIDER_CONFIGS`) and instantiated in
[`src/agent/index.ts`](../src/agent/index.ts). Most OpenAI-compatible providers
only need a `PROVIDER_CONFIGS` entry. See
[architecture.md](./architecture.md) and [CONTRIBUTING.md](../CONTRIBUTING.md).
