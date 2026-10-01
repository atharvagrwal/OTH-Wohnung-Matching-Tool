# SAML SP credentials

This folder holds the Service Provider's signing key/certificate for the Shibboleth
integration. **Never commit the actual `.key`/`.crt` files** — they're gitignored on
purpose (see the repo root `.gitignore`).

## Generating a fresh keypair (do this on the deployment VM, not a shared dev machine)

```bash
openssl req -x509 \
  -newkey rsa:2048 \
  -keyout sp-private-key-pkcs1.key \
  -out sp-certificate.crt \
  -days 365 \
  -nodes \
  -subj "/CN=oth-nest-sp"

# Spring Security needs PKCS#8, not PKCS#1
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt \
  -in sp-private-key-pkcs1.key \
  -out sp-private-key.key
```

Place the resulting `sp-private-key.key` and `sp-certificate.crt` directly in this folder
(that's the default `file:./saml-credentials/...` location referenced by
`application-shibboleth.properties`), or point `SAML_SP_PRIVATE_KEY` /
`SAML_SP_CERTIFICATE` env vars at wherever you actually stored them.

## Important

- The course's `img_shibboleth_tomcat` image / `MyShibboleth.zip` ship a **shared** keypair
  used by everyone in the course. That's fine for the throwaway POC against the course's
  test IdP, but generate a **new, unique** keypair before registering with the real OTH/DFN
  IdP — a key everyone has is not a private key.
- Whatever you generate for the real OTH integration must be backed up somewhere safe
  (password manager / secrets vault), since losing it means re-registering with DFN.
