# Security policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report them privately through GitHub: open the repository's **Security** tab
and choose **Report a vulnerability**. Include the affected version or commit,
the steps to reproduce, and the impact you observed.

We aim to acknowledge reports within a week and will keep you informed while we
work on a fix. We credit reporters in the release notes unless they prefer to
stay anonymous.

Vulnerabilities in TYDAL itself (the vault server, `@tydal/client`) belong in
the [TYDAL repository](https://github.com/eonity-org/tydal).

## Supported versions

Only the latest commit on `main` is supported. Fixes are not backported.

## Deployment hardening

Operator responsibilities (secrets, `PREVIEW_MODE`, and the fact
that curators can make the server fetch URLs) are described under
"Security considerations" in [DEPLOY.md](DEPLOY.md).
