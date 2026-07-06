# Security policy

## Reporting a vulnerability

Please report security issues privately. **Do not open a public issue for
security vulnerabilities.**

Use GitHub's private vulnerability reporting for this repository:
**Security → Report a vulnerability**
(<https://github.com/nitingpt000/inkling/security/advisories/new>).

Include as much detail as you can:

- A description of the issue and its impact.
- Steps to reproduce or a proof of concept.
- Affected version(s) and environment.

You can expect an initial acknowledgement within a few days. Once a fix is
available, a patched release will be published and the reporter credited unless
they prefer to remain anonymous.

## Supported versions

Inkling is pre-1.0. Security fixes are applied to the latest published version.

## Handling of secrets

Inkling is designed to avoid exposing credentials:

- Provider keys and settings are stored in `~/.inkling/.env` with restricted
  file permissions and are never written into generated documentation.
- The documentation agent is instructed not to read or reproduce secrets, `.env`
  files, tokens, or private keys.
- Local commands (`export`, `search`, `validate`) operate only on the `inkling/`
  directory and make no network calls.

If you find a case where secrets could leak into generated output or logs,
please report it using the process above.
