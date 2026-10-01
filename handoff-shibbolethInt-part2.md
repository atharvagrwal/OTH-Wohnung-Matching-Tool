# Handoff Part 2: Shibboleth VM Deployment — Debugging Session

**Date**: 2026-09-30 (later same day)
**Workspace**: `c:\Users\uik13297\source\repo\OTH-Wohnung-Matching-Tool`
**Continues from**: `C:\Users\uik13297\AppData\Local\Temp\handoff-shibboleth-2026-09-30.md` (read that FIRST — it has the full repo analysis, all Shibboleth code changes with exact file contents, and the original step-by-step VM guide. This document only covers what happened *after* that handoff, i.e. the actual VM deployment attempt and where it got stuck.)

---

## 0. tl;dr — current state

- ✅ Code changes from Part 1 are unchanged and still correct (verify against Part 1 handoff).
- ✅ Docker Shibboleth IdP container running and verified working on the VM (metadata confirmed via `curl`).
- ✅ Local Tomcat installed on the VM, port conflict fixed, app WAR builds and deploys (~3s, real work happening).
- ❌ **Still broken**: every path under the deployed app's context (`/othnest/offers`, `/othnest/saml2/service-provider-metadata/shibboleth-sp`) returns a **Tomcat-level 404** (not a Spring/security 403/401) — strongly suggesting **Spring Boot's `WebApplicationInitializer` never actually started inside the WAR**, even though Tomcat's `HostConfig` logs a "successful" deployment.
- **Immediate next diagnostic** (not yet run): see §5.

---

## 1. VM environment facts discovered this session (important — save time for next agent)

- **VM**: `im-vm-105.hs-regensburg.de`, user `standard`, repo cloned at `~/.ssh/OTH-Wohnung-Matching-Tool` (yes, under `.ssh` — that's just where the user happened to clone it, not meaningful).
- **This VM is NOT a clean machine.** It was previously used for an unrelated course project (`hsp-collaboration-tool-frontend/backend/db` Docker containers, all stopped, visible via `docker ps -a`).
- **`/opt/tomcat` already had a pre-existing Tomcat 10.0.27 installation** (built Oct 2022, found via VM setup in Jan 2023 per file timestamps) **before we ever touched it**. Our attempt to install Tomcat 10.1.59 via `wget`+`tar --strip-components=1` did NOT fully replace it — the running Tomcat is still 10.0.27 (confirmed via `bin/version.sh` and the startup log's `VersionLoggerListener` output).
- **A systemd unit `tomcat.service` exists** (`systemctl cat tomcat.service`) pointing at the same `/opt/tomcat`, but configured for **Java 11** (`JAVA_HOME=/usr/lib/jvm/java-1.11.0-openjdk-amd64`) and currently in `failed` state. It is NOT what's running — our manual `startup.sh`/`shutdown.sh` invocations are, confirmed on Java 21. Safe to ignore, but be aware it exists if things get confusing again.
- **`/opt/tomcat/webapps/` ships with bundled content from Jan 16-17 2023**: `ROOT/` (+`ROOT.war`), `docs/`, `examples/`, `host-manager/`, `manager/`, `sample/` (+`sample.war`), and a mysterious **`fea38494/` + `fea38494.war` (44MB)** — origin unknown, never identified, presumably another pre-existing course artifact. **These files survive `rm -rf /opt/tomcat/webapps/*` across multiple attempts, even after `chattr -R -i` (which turned out to be a no-op — `lsattr` showed `e`, not `i`, so immutability was never actually the cause).** The exact mechanism by which they persist was never conclusively identified — we stopped trying to delete them and worked around the problem instead (see §2).
- Port 8080 on the host is occupied by the **Shibboleth IdP Docker container** (mapped `-p 8080:8080` from the very first `docker run`), which is why Tomcat's connector had to be moved to 8081 (`conf/server.xml`, `Connector port="8081"` — this edit **did** stick correctly, confirmed via `ss -tlnp`).
- The Shibboleth IdP Docker image (`alixandresantana/img_shibboleth_tomcat`) is **arm64-only** (confirmed via `docker manifest inspect` — single manifest, no multi-arch index) and needed QEMU emulation (`qemu-user-static` + `tonistiigi/binfmt --install all`) to run on this amd64 VM. Also needed an **extra `-p 443:8443` port mapping** because the IdP's own generated SAML metadata declares SSO endpoints without an explicit port (implying default `443`), while the container's HTTPS connector is actually on `8443`.
- Final working IdP container run command:
  ```bash
  docker run -d --name shibboleth-idp -p 8443:8443 -p 443:8443 -p 8080:8080 --platform linux/arm64 alixandresantana/img_shibboleth_tomcat
  ```
- Confirmed IdP entity ID: `https://fc94bed96e9b/idp/shibboleth` (hostname is baked into the image at build time, deterministic across container restarts — this exactly matches the placeholder default already in `application-shibboleth.properties` from Part 1, so **no env var overrides were needed** for the IdP side).

---

## 2. The pivot: deploying at `/othnest` instead of `/` (ROOT)

After extensive debugging (chattr, deleting `conf/Catalina/localhost/*.xml`, deleting `work/Catalina/localhost/*`, full webapps wipe+redeploy — none of it stopped the old bundled `ROOT/` content from reappearing, and `ROOT.war` deployments kept finishing suspiciously fast at ~12-14ms, clearly not actually processing our 85MB Spring Boot fat WAR), we **gave up fighting the ROOT context** and deployed under a fresh, never-before-used context name instead:

```bash
sudo rm -f /opt/tomcat/webapps/ROOT.war
sudo cp target/oth-nest-0.0.1-SNAPSHOT.war /opt/tomcat/webapps/othnest.war
sudo chown tomcat:tomcat /opt/tomcat/webapps/othnest.war
```

This **worked** in the sense that `othnest.war` deployment now takes a real ~2.9 seconds (vs. 12ms for `ROOT.war`) — confirming a fresh context name has no stale state to interfere with. Also updated the Shibboleth success-redirect to match:

```bash
# /opt/tomcat/bin/setenv.sh (current contents on the VM)
export SPRING_PROFILES_ACTIVE=shibboleth
export SHIBBOLETH_SUCCESS_REDIRECT=http://localhost:8081/othnest/sso-callback
```

**But** — even at `/othnest`, every single path 404s (Tomcat's own 404 page, message `"The requested resource [/othnest/offers] is not available"`), including `/othnest/saml2/service-provider-metadata/shibboleth-sp`, which Spring Security auto-generates regardless of any auth config. A blanket 404 on literally everything under the context — even the SAML metadata endpoint — is the signature of **Spring Boot's `WebApplicationInitializer.onStartup()` never being invoked by Tomcat**, i.e. the WAR is "deployed" as an empty shell with zero servlets registered, rather than an actual Spring Boot application failure (which would usually still show *some* mapped paths, or an error page).

### Why this might be happening (not yet confirmed)
- Tomcat 10.0.27 implements Servlet 5.0 (Jakarta EE 9). Spring Boot 3.3.5 targets Servlet 5.0+ minimum, so this *should* be compatible — but the deploy log shows: `WARNING ... WebXml.setVersion Unknown version string [6.0]. Default version will be used.` This could be completely benign (Tomcat just normalizes and continues), or it could indicate a `web-fragment.xml` parsing hiccup from one of our dependencies (springdoc-openapi? spring-security-saml2?) that's subtly breaking Tomcat's `ServletContainerInitializer` (SCI) scanning — which is the exact mechanism Spring uses to auto-register `DispatcherServlet` from inside a WAR (via `SpringServletContainerInitializer` finding our `OthNestApplication extends SpringBootServletInitializer`).
- Notably absent from every `catalina.out` tail we captured: **any Spring Boot banner, any `Started OthNestApplication` line, any Hibernate/JPA logging** — the kind of verbose startup chatter we saw constantly when running locally via `mvnw spring-boot:run`. This is the strongest signal that Spring Boot's context never even began initializing inside the WAR.

---

## 3. Everything else confirmed working (don't re-verify these, just build on them)

- `./mvnw clean package -DskipTests` **builds successfully on the VM** (no OpenSAML/Maven Central TLS issue like on the Windows dev machine — campus network doesn't intercept TLS). WAR at `target/oth-nest-0.0.1-SNAPSHOT.war`, consistently **85,272,303 bytes** — use this exact byte count to verify any future copy operation actually copied the right file.
- SP keypair generated per Part 1's `saml-credentials/README.md` instructions (assume this happened — re-verify `ls -la ~/.ssh/OTH-Wohnung-Matching-Tool/saml-credentials/` if picking this back up, the files should be `sp-private-key.key` + `sp-certificate.crt`).
- JDK 21 confirmed active (`java -version` / the startup log's `JVM Version: 21.0.12.1+1`).

---

## 4. Immediate next diagnostic (this is where the conversation left off)

Run this and read the **entire** output, not just a tail:
```bash
sudo grep -n "OthNestApplication\|Started Application\|o\.s\.boot\|ERROR\|SEVERE\|Exception\|Caused by" /opt/tomcat/logs/catalina.out | tail -80
```

**If this shows nothing about `OthNestApplication` or a Spring Boot banner**: Spring Boot never started. Next steps to try, roughly in order of likely payoff:
1. Check that `jakarta.servlet.ServletContainerInitializer` files actually exist in the WAR: `unzip -p target/oth-nest-0.0.1-SNAPSHOT.war META-INF/services/jakarta.servlet.ServletContainerInitializer 2>&1` (from a Spring dependency jar nested inside `WEB-INF/lib/`, so this top-level `unzip -p` likely won't find it directly — may need to check inside `WEB-INF/lib/spring-web-*.jar` nested inside the WAR, e.g. extract WAR fully to a scratch dir and inspect).
2. Try enabling more verbose Tomcat logging for `org.apache.catalina.startup.ContextConfig` / `HostConfig` (DEBUG level in `conf/logging.properties`) to see if SCI scanning is silently skipping our WAR.
3. As a sanity check, try deploying the **unmodified** original WAR built before any Shibboleth changes (if available) to rule out something in the SAML dependency chain specifically breaking WAR deployment vs. a pre-existing/general WAR deployment issue on this particular old Tomcat 10.0.27.
4. Consider whether `<packaging>war</packaging>` + `spring-boot-starter-tomcat` as `provided` (from Part 1) is fully correct for Tomcat 10.0.27 specifically — Spring Boot's WAR support is generally tested against more recent Tomcat 10.1.x; there could be a genuine compatibility gap with 10.0.x that wasn't anticipated.
5. As a fallback if WAR-in-external-Tomcat keeps failing on this specific pre-existing/weird VM install: **run the app instead as an executable JAR with its own embedded Tomcat**, bypassing the external Tomcat entirely (`java -jar target/oth-nest-0.0.1-SNAPSHOT.war` actually works fine as a self-contained executable even with WAR packaging, since Spring Boot's repackaged WARs are still runnable standalone — just pick a free port like 8082 via `--server.port=8082` and set `SPRING_PROFILES_ACTIVE=shibboleth` in the environment). This sidesteps the entire external-Tomcat mystery and might be the pragmatic unblock if diagnosis #1-4 doesn't resolve quickly — worth strongly considering given how much time this Tomcat-specific debugging has already consumed relative to the actual goal (proving the SAML handshake works).

---

## 5. Clarifications given mid-session (avoid repeating these misunderstandings)

- The user's own Windows machine's frontend (`npm run dev`) / backend (`mvnw spring-boot:run`) dev setup is **completely separate** from this VM work — neither needs to be running for the VM SAML testing.
- A native browser Basic-Auth popup seen at some point was almost certainly **Tomcat Manager's** login prompt (`admin`/`deployer` credentials set up early in this session), not anything related to our app or the IdP — never fully confirmed which exact URL triggered it, but it's a known red herring, not a new bug.
- The old "Tomcat setup successful" welcome page the user saw earlier was the **pre-existing bundled `ROOT/` directory's default content** — nothing we ever controlled, and its disappearance after we deleted `ROOT.war` is *expected and correct*, not a regression.

---

## 6. Security reminders (carried over, still unresolved)

- The VM password shared in plaintext chat early in this engagement (`im-vm-105.hs-regensburg.de`, user `standard`) — **confirm with the user whether this has been rotated yet.** Never store it in any file/memory.
- Tomcat Manager's `admin`/`deployer` passwords were set to placeholder values early on (`654321`-style examples from the course guide) — if still using those literal values, change them before this VM is used for anything beyond throwaway testing.
- Nothing in this session touched git — all Part 1 code changes remain uncommitted in the workspace per Part 1's warning. Still true.

---

## 7. Suggested skills for the next session

- No specific skill fits "debug a mystery pre-existing Tomcat install" — this is generic Linux/sysadmin + Tomcat troubleshooting, best handled directly.
- If the JAR-instead-of-WAR fallback (§4.5) is pursued, no special skill needed either — it's a straightforward Spring Boot config change.
- Same caveats as Part 1 apply: don't invoke any `modernize-*` agents, this isn't a migration/modernization workflow.

---

## 8. Open questions to carry forward

1. What is `fea38494.war`/`fea38494/` actually? Never identified. Harmless to ignore, but worth asking whoever set up this course VM if it ever comes up.
2. Root cause of the WAR-deploys-but-nothing-responds issue — never conclusively diagnosed. §4 has the next steps.
3. Same open questions from Part 1 still apply (real SAML attribute names, VM password rotation, frontend/backend co-location for production).
