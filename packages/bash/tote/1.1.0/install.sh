#!/bin/sh
# tote installer.
#
#   curl -fsSL https://dropr.sylvain.sh/bash/tote@latest/install.sh | sh
#   curl -fsSL https://dropr.sylvain.sh/bash/tote@latest/install.sh | sh -s -- 1.1.0-beta.1
#
# Downloads the release archive for this machine from GitHub Releases, checks its SHA-256
# against the release checksums file, verifies the minisign signature of that file, installs
# the binary in ~/.local/bin and writes an install receipt for `tote update`.
# It never runs as root, never calls sudo and never edits shell startup files.
#
# Signature check, first tool available wins:
#   1. minisign 0.10 or later;
#   2. OpenSSL 3 (BLAKE2b-512 digest, then Ed25519), after a self-test on known vectors;
#   3. none: SHA-256 only, with a warning (an error with TOTE_REQUIRE_SIGNATURE=1).
# A signature that does not verify is always an error.
#
# Environment:
#   TOTE_VERSION            version to install (or first argument); default: latest stable
#   TOTE_INSTALL_DIR        target directory; default: ~/.local/bin
#   TOTE_INSTALL_BASE       release root, https:// or file:// only (mirrors and tests);
#                           default: https://github.com/totecli/tote/releases
#                           layout: <base>/latest, <base>/download/v<version>/<asset>
#   TOTE_INSTALL_PUBKEY     minisign public key, honoured with a file:// base only (tests)
#   TOTE_REQUIRE_SIGNATURE  1: fail when no signature verifier is available
#   TOTE_INSTALL_YES        1: do not ask about the Ubuntu PPA
#   TOTE_INSTALL_FORCE      1: allow an older release, or a copy beside an apt install

set -eu

# Release signing keys (minisign public keys). The key id inside a signature selects the
# key; the second one is the offline "next" key, used only after a rotation.
# The installer refuses to run with a placeholder instead of a key.
TOTE_MINISIGN_KEYS='
RWTTj50yYWk72oCPtVJZ8hrpENxKKpQHDtQl3l1JkOxauemhwepIFON3
RWS7eI0zAwZGD3nDouKjNMVgt3opeJ9Lf3K3RNRKeNYIV1Hm9L0UirQT
'

REPO_URL=https://github.com/totecli/tote
# The Launchpad PPA (Ubuntu only) is published: the installer offers it on Ubuntu and its
# derivatives. Set this to 0 to stop offering it.
PPA_AVAILABLE=1

say() { printf '%s\n' "$*"; }
warn() { printf 'tote installer: warning: %s\n' "$*" >&2; }
die() {
    printf 'tote installer: error: %s\n' "$*" >&2
    exit 1
}

# ─── Private working directory ───────────────────────────────────────
# Every file created in it is recorded first, so the cleanup removes exactly those files
# and then the empty directory: no glob, no recursive delete.
TMPD=$(mktemp -d 2>/dev/null) || die "cannot create a temporary directory"
: > "$TMPD/files"
track() {
    printf '%s\n' "$TMPD/$1" >> "$TMPD/files"
    printf '%s' "$TMPD/$1"
}
cleanup() {
    if [ -f "$TMPD/files" ]; then
        while IFS= read -r f; do
            rm -f -- "$f"
        done < "$TMPD/files"
        rm -f -- "$TMPD/files"
    fi
    rmdir -- "$TMPD" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 1' INT TERM HUP

# ─── Preconditions ───────────────────────────────────────────────────

if [ "$(id -u)" -eq 0 ]; then
    die "do not run this installer as root or with sudo: it installs tote for your user"
fi
for cmd in curl tar uname; do
    command -v "$cmd" >/dev/null 2>&1 || die "'$cmd' is required"
done

BASE=${TOTE_INSTALL_BASE:-$REPO_URL/releases}
BASE=${BASE%/}
case $BASE in
    https://*) PROTO='=https' ;;
    file://*) PROTO='=file' ;;
    *) die "TOTE_INSTALL_BASE must start with https:// or file://: $BASE" ;;
esac

# Only well-formed keys count: base64 of "Ed" || key id (8 bytes) || Ed25519 key (32 bytes).
keys=$(printf '%s\n' "$TOTE_MINISIGN_KEYS" | grep -E '^RW[A-Za-z0-9+/]{54}$' || true)
if [ -n "${TOTE_INSTALL_PUBKEY:-}" ]; then
    [ "$PROTO" = '=file' ] || die "TOTE_INSTALL_PUBKEY is only accepted with a file:// base"
    keys=$(printf '%s\n' "$TOTE_INSTALL_PUBKEY" | tr ' ' '\n' | grep -E '^RW[A-Za-z0-9+/]{54}$' || true)
fi
[ -n "$keys" ] || die "this installer has no release key: nothing was installed"

# Redirects must keep the same scheme: an https download never ends on http.
fetch() {
    curl -fsSL --proto "$PROTO" --proto-redir "$PROTO" --tlsv1.2 \
        --connect-timeout 15 --max-time 600 -o "$2" "$1"
}

# ─── Platform ────────────────────────────────────────────────────────

OS=$(uname -s)
ARCH=$(uname -m)
case $OS in
    Linux) OS=linux ;;
    Darwin) OS=darwin ;;
    *) die "unsupported system: $OS (Linux and macOS only)" ;;
esac
case $ARCH in
    x86_64 | amd64) ARCH=amd64 ;;
    aarch64 | arm64) ARCH=arm64 ;;
    *) die "unsupported architecture: $ARCH (amd64 and arm64 only)" ;;
esac
# An Intel shell under Rosetta on Apple silicon still gets the native binary.
if [ "$OS" = darwin ] && [ "$ARCH" = amd64 ] &&
    [ "$(sysctl -n sysctl.proc_translated 2>/dev/null || true)" = 1 ]; then
    ARCH=arm64
fi

# ─── An apt-managed tote is left alone ───────────────────────────────

# The .deb packages ship this marker; dpkg-query covers older packages.
apt_owned() {
    [ -f /usr/share/tote/install-method ] && return 0
    p=$(command -v tote 2>/dev/null || true)
    [ -n "$p" ] && command -v dpkg-query >/dev/null 2>&1 && dpkg-query -S "$p" >/dev/null 2>&1
}
if [ "$OS" = linux ] && apt_owned && [ "${TOTE_INSTALL_FORCE:-}" != 1 ]; then
    say "tote is already installed by apt. Update it with:"
    say "  sudo apt update && sudo apt upgrade tote"
    say "To switch to this installer, remove the package first: sudo apt remove tote"
    exit 1
fi

# ─── Version ─────────────────────────────────────────────────────────

VERSION=${1:-${TOTE_VERSION:-latest}}
# Tags carry a "v" prefix (v1.0.0); versions, file names and receipts do not.
case $VERSION in
    v[0-9]*) VERSION=${VERSION#v} ;;
esac

if [ "$VERSION" = latest ]; then
    # GitHub answers /releases/latest with a redirect to the newest non-prerelease tag;
    # a mirror serves a small text file instead.
    url=$(curl -fsSIL --proto "$PROTO" --proto-redir "$PROTO" --tlsv1.2 --connect-timeout 15 \
        --max-time 60 -o /dev/null -w '%{url_effective}' "$BASE/latest") ||
        die "cannot reach $BASE/latest"
    case $url in
        */releases/tag/*) VERSION=${url##*/releases/tag/}; VERSION=${VERSION#v} ;;
        *)
            f=$(track latest)
            fetch "$BASE/latest" "$f" || die "cannot download $BASE/latest"
            VERSION=$(head -n 1 "$f" | tr -d '\r')
            VERSION=${VERSION#v}
            ;;
    esac
fi
# The value goes into file names and URLs: strict SemVer only.
printf '%s\n' "$VERSION" |
    grep -Eq '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z]+(\.[0-9A-Za-z]+)*)?$' ||
    die "invalid version: $VERSION"
case $VERSION in
    *-*) CHANNEL=beta ;;
    *) CHANNEL=stable ;;
esac

# ─── Offer the PPA on Ubuntu ─────────────────────────────────────────

os_release_has() {
    [ -r /etc/os-release ] || return 1
    sed -n -e 's/^ID=//p' -e 's/^ID_LIKE=//p' /etc/os-release | tr -d '"' | tr ' ' '\n' | grep -qx "$1"
}
if [ "$PPA_AVAILABLE" = 1 ] && [ "$OS" = linux ] && [ "$CHANNEL" = stable ] &&
    command -v apt-get >/dev/null 2>&1 && os_release_has ubuntu; then
    say "A Launchpad PPA is available for Ubuntu: apt checks every update and 'apt upgrade' keeps"
    say "tote current. To use it instead:"
    say ""
    say "  sudo add-apt-repository ppa:totecli/tote && sudo apt install tote"
    say ""
    if [ "${TOTE_INSTALL_YES:-}" != 1 ] && (exec < /dev/tty) 2>/dev/null; then
        printf 'Install with this script instead? [Y/n] '
        answer=
        read -r answer < /dev/tty || answer=
        case $answer in
            n* | N*)
                say "Nothing installed."
                exit 0
                ;;
        esac
    fi
fi

# ─── Download ────────────────────────────────────────────────────────

ARCHIVE="tote_${VERSION}_${OS}_${ARCH}.tar.gz"
SUMS="tote_${VERSION}_checksums.txt"
SIG="$SUMS.minisig"
URL="$BASE/download/v$VERSION"

say "Installing tote $VERSION ($OS/$ARCH, $CHANNEL)"
archive=$(track archive)
sums=$(track sums)
sig=$(track sig)
fetch "$URL/$ARCHIVE" "$archive" || die "cannot download $URL/$ARCHIVE"
fetch "$URL/$SUMS" "$sums" || die "cannot download $URL/$SUMS"
fetch "$URL/$SIG" "$sig" || die "cannot download $URL/$SIG"

# ─── Signature of the checksums file ─────────────────────────────────

# minisign 0.10 introduced -H (refuse legacy, non-prehashed signatures).
minisign_usable() {
    command -v minisign >/dev/null 2>&1 || return 1
    v=$(minisign -v 2>/dev/null | sed -n 's/^minisign \([0-9][0-9]*\)\.\([0-9][0-9]*\).*/\1 \2/p')
    [ -n "$v" ] || return 1
    set -- $v
    [ "$1" -gt 0 ] || [ "$2" -ge 10 ]
}

b64d() { openssl base64 -d -A; }
hex() { od -An -tx1 | tr -d ' \n'; }

# Ed25519 SubjectPublicKeyInfo (RFC 8410): fixed 12-byte prefix, then the 32-byte key.
# 12 bytes encode to exactly 16 base64 characters, so the two parts concatenate.
make_pem() { # raw-key-file pem-file
    {
        echo "-----BEGIN PUBLIC KEY-----"
        printf 'MCowBQYDK2VwAyEA%s\n' "$(openssl base64 -A < "$1")"
        echo "-----END PUBLIC KEY-----"
    } > "$2"
}
ed25519_ok() { # pem message-file signature-file
    openssl pkeyutl -verify -pubin -inkey "$1" -rawin -in "$2" -sigfile "$3" >/dev/null 2>&1
}

# OpenSSL must prove it has BLAKE2b-512 and Ed25519 before a failure can mean tampering:
# RFC 7693 appendix A ("abc") and RFC 8032 section 7.1 test 2 (message 0x72).
openssl_usable() {
    command -v openssl >/dev/null 2>&1 || return 1
    case $(openssl version 2>/dev/null) in
        OpenSSL\ [3-9]*) ;;
        *) return 1 ;;
    esac
    d=$(printf 'abc' | openssl dgst -blake2b512 -binary 2>/dev/null | hex) || return 1
    [ "$d" = ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d17d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923 ] ||
        return 1
    tk=$(track t.key)
    tp=$(track t.pem)
    tm=$(track t.msg)
    ts=$(track t.sig)
    printf '%s' 'PUAXw+hDiVqStwqnTRt+vJyYLM8uxJaMwM1V8Sr0Zgw=' | b64d > "$tk" || return 1
    printf '%s' 'kqAJqfDUyrhyDoILX2QlQKKye1QWUD+Ps3YiI+vbadoIWsHkPhWZbkWPNhPQ8R2MOHsurrQwKu6wDSkWErsMAA==' |
        b64d > "$ts" || return 1
    printf 'r' > "$tm"
    make_pem "$tk" "$tp"
    ed25519_ok "$tp" "$tm" "$ts"
}

# Prehashed minisign signature ("ED"): Ed25519 over BLAKE2b-512(file), then the global
# signature over signature || trusted comment. Prints the trusted comment.
verify_openssl() { # checksums-file minisig-file
    sb=$(track sig.bin)
    sed -n 2p "$2" | b64d > "$sb" 2>/dev/null || return 1
    [ "$(wc -c < "$sb" | tr -d ' ')" = 74 ] || return 1
    [ "$(head -c 2 "$sb")" = ED ] || return 1
    sid=$(head -c 10 "$sb" | tail -c 8 | hex)
    pk=$(track pk.bin)
    found=
    for k in $keys; do
        printf '%s' "$k" | b64d > "$pk" 2>/dev/null || continue
        [ "$(wc -c < "$pk" | tr -d ' ')" = 42 ] || continue
        [ "$(head -c 10 "$pk" | tail -c 8 | hex)" = "$sid" ] && found=1 && break
    done
    [ -n "$found" ] || return 1
    raw=$(track pk.raw)
    pem=$(track pk.pem)
    s=$(track s.bin)
    h=$(track h.bin)
    g=$(track g.msg)
    gs=$(track g.sig)
    tail -c 32 "$pk" > "$raw"
    make_pem "$raw" "$pem"
    tail -c 64 "$sb" > "$s"
    openssl dgst -blake2b512 -binary "$1" > "$h" || return 1
    ed25519_ok "$pem" "$h" "$s" || return 1
    line=$(sed -n 3p "$2")
    case $line in
        "trusted comment: "*) ;;
        *) return 1 ;;
    esac
    comment=${line#trusted comment: }
    { cat "$s"; printf '%s' "$comment"; } > "$g"
    sed -n 4p "$2" | b64d > "$gs" 2>/dev/null || return 1
    ed25519_ok "$pem" "$g" "$gs" || return 1
    printf '%s\n' "$comment"
}

VERIFIED_BY=
COMMENT=
if minisign_usable; then
    for k in $keys; do
        if COMMENT=$(minisign -V -H -P "$k" -m "$sums" -x "$sig" -Q 2>/dev/null); then
            VERIFIED_BY=minisign
            break
        fi
    done
    [ -n "$VERIFIED_BY" ] || die "the signature of $SUMS does not verify (minisign): nothing was installed"
elif openssl_usable; then
    COMMENT=$(verify_openssl "$sums" "$sig") ||
        die "the signature of $SUMS does not verify (OpenSSL): nothing was installed"
    VERIFIED_BY=openssl
elif [ "${TOTE_REQUIRE_SIGNATURE:-}" = 1 ]; then
    die "no signature verifier (minisign 0.10+, or OpenSSL 3 with Ed25519 and BLAKE2b)"
else
    cat >&2 <<MSG
tote installer: warning: the signature of $SUMS was NOT verified.
  Neither minisign 0.10+ nor OpenSSL 3 with Ed25519 and BLAKE2b is available, so only the
  SHA-256 checksum is checked: it catches a corrupted download, not a tampered release.
  To verify, install minisign (apt install minisign, brew install minisign) and run this
  again. TOTE_REQUIRE_SIGNATURE=1 makes this an error.
MSG
fi

# The trusted comment is signed: it must describe exactly the release that was asked for.
field() { printf '%s\n' "$COMMENT" | tr '\t' '\n' | sed -n "s/^$1://p" | head -n 1; }
TIMESTAMP=0
if [ -n "$VERIFIED_BY" ]; then
    [ "$(field project)" = tote ] || die "signed comment: not a tote release"
    [ "$(field version)" = "$VERSION" ] || die "signed comment: version $(field version), expected $VERSION"
    [ "$(field file)" = "$SUMS" ] || die "signed comment: file $(field file), expected $SUMS"
    [ "$(field channel)" = "$CHANNEL" ] || die "signed comment: channel $(field channel), expected $CHANNEL"
    TIMESTAMP=$(field timestamp)
    case $TIMESTAMP in
        '' | *[!0-9]*) die "signed comment: bad timestamp" ;;
    esac
    say "Signature verified with $VERIFIED_BY ($SUMS)"
fi

# ─── Checksum of the archive (always) ────────────────────────────────

sha256_of() {
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$1" | cut -d ' ' -f 1
    elif command -v shasum >/dev/null 2>&1; then
        shasum -a 256 "$1" | cut -d ' ' -f 1
    elif command -v openssl >/dev/null 2>&1; then
        openssl dgst -sha256 -r "$1" | cut -d ' ' -f 1
    else
        return 1
    fi
}
expected=$(awk -v f="$ARCHIVE" '$2 == f || $2 == "*" f { print $1 }' "$sums")
[ "$(printf '%s\n' "$expected" | grep -c .)" = 1 ] || die "$ARCHIVE is not listed once in $SUMS"
actual=$(sha256_of "$archive") || die "no SHA-256 tool (sha256sum, shasum or openssl)"
[ "$actual" = "$(printf '%s' "$expected" | tr 'A-F' 'a-f')" ] ||
    die "SHA-256 mismatch for $ARCHIVE: nothing was installed"

# ─── Unpack and check the binary ─────────────────────────────────────

bin=$(track tote)
tar -xzf "$archive" -C "$TMPD" tote || die "$ARCHIVE has no 'tote' binary"
[ -f "$bin" ] && [ ! -L "$bin" ] || die "$ARCHIVE: 'tote' is not a regular file"
chmod 0755 "$bin"
reported=$("$bin" --version 2>/dev/null || true)
case $reported in
    *"$VERSION"*) ;;
    *) die "the downloaded binary reports '$reported', expected $VERSION" ;;
esac

# ─── No silent rollback ──────────────────────────────────────────────

case ${XDG_STATE_HOME:-} in
    /*) STATE_DIR=$XDG_STATE_HOME/tote ;;
    *) STATE_DIR=$HOME/.local/state/tote ;;
esac
RECEIPT=$STATE_DIR/install.json
if [ -f "$RECEIPT" ] && [ "${TOTE_INSTALL_FORCE:-}" != 1 ]; then
    prev=$(sed -n 's/^ *"release_timestamp": *\([0-9][0-9]*\).*/\1/p' "$RECEIPT" | head -n 1)
    if [ -n "$prev" ] && [ "$TIMESTAMP" -gt 0 ] && [ "$TIMESTAMP" -lt "$prev" ]; then
        die "tote $VERSION is older than the installed release: set TOTE_INSTALL_FORCE=1 to downgrade"
    fi
fi

# ─── Install ─────────────────────────────────────────────────────────

DIR=${TOTE_INSTALL_DIR:-$HOME/.local/bin}
case $DIR in
    /*) ;;
    *) die "TOTE_INSTALL_DIR must be an absolute path: $DIR" ;;
esac
nl='
'
# These values are written as JSON strings below.
case $DIR$STATE_DIR$BASE in
    *"$nl"* | *'"'* | *\\*) die "unsupported character in $DIR, $STATE_DIR or $BASE" ;;
esac
mkdir -p "$DIR" || die "cannot create $DIR"
# Copy beside the target, then rename: a running tote keeps its old inode.
cp "$bin" "$DIR/.tote.new.$$" || die "cannot write in $DIR"
chmod 0755 "$DIR/.tote.new.$$"
mv -f "$DIR/.tote.new.$$" "$DIR/tote" || die "cannot install $DIR/tote"

# ─── Install receipt, read by `tote update` and `tote uninstall` ─────

mkdir -p "$STATE_DIR" && chmod 0700 "$STATE_DIR" || die "cannot create $STATE_DIR"
now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
cat > "$RECEIPT.new.$$" <<EOF
{
    "schema": 1,
    "install_method": "script",
    "version": "$VERSION",
    "channel": "$CHANNEL",
    "path": "$DIR/tote",
    "os": "$OS",
    "arch": "$ARCH",
    "source": "$BASE",
    "verified_by": "${VERIFIED_BY:-sha256}",
    "release_timestamp": $TIMESTAMP,
    "installed_at": "$now"
}
EOF
mv -f "$RECEIPT.new.$$" "$RECEIPT" || die "cannot write $RECEIPT"

say "tote $VERSION installed in $DIR/tote"
case ":$PATH:" in
    *":$DIR:"*)
        first=$(command -v tote 2>/dev/null || true)
        if [ -n "$first" ] && [ "$first" != "$DIR/tote" ]; then
            warn "another tote comes first in PATH: $first"
        fi
        ;;
    *)
        say ""
        say "$DIR is not in your PATH. Add this line to ~/.bashrc or ~/.zshrc, then open a new shell:"
        say "  export PATH=\"$DIR:\$PATH\""
        ;;
esac
say "Run: tote"
