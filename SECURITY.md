# Security Policy

Please do not report vulnerabilities through public GitHub issues if exploit
details are involved. Use GitHub Security Advisories or the maintainer contact
listed in the repository.

## Automation security principles

- Workflows are read-only and report-only by default.
- Public issue/PR text is treated as untrusted input.
- Secrets are never printed.
- Write operations require explicit maintainer opt-in.
- TriagePilot v0.1.0 does not implement GitHub write operations.
