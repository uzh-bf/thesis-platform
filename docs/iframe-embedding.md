# Embedding the Thesis Platform in an iframe

The platform is iframe-ready: it can be embedded on department or
university websites and adapts its UI, auth flows, and security headers
accordingly.

## Basic usage

```html
<iframe
  src="https://theses.df.uzh.ch"
  style="width: 100%; border: 0;"
  title="Thesis Market"
></iframe>
```

## Allowed embedding origins (CSP)

The app sends a `Content-Security-Policy: frame-ancestors …` header on
every response. By default it allows:

```
'self' https://*.uzh.ch
```

To allow other hosts, set the `FRAME_ANCESTORS` environment variable to a
space-separated [CSP source list](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors),
e.g.:

```
FRAME_ANCESTORS='self' https://*.uzh.ch https://partner.example.com
```

Because the app is built with `output: 'standalone'`, the header value is
baked in at **build time**. For Docker deployments, pass it as a build
argument (`--build-arg FRAME_ANCESTORS=…` or via `build-args` in the
GitHub Actions image workflows); setting it only on the running container
has no effect.

## What changes in embedded mode

Embedded mode is detected automatically (`window.self !== window.top`):

- **Header**: the full UZH branding block is replaced with a compact
  title row; all action buttons stay available.
- **Footer**: reduced to a slim bar (copyright, contact, FAQ, Impressum).
- **External links** (e.g. the other department's platform) open in a new
  tab instead of navigating the iframe.
- **Sign-in / sign-out** run in a popup window, because the identity
  providers (Microsoft Entra, Auth0) refuse to render inside iframes.
  When the popup completes, the embedded page reloads with the new
  session state.

## Automatic iframe resizing

While embedded, the app posts its document height to the parent page so
the host can resize the iframe and avoid nested scrollbars:

```js
window.addEventListener('message', (event) => {
  const data = event.data
  if (data?.source === 'thesis-platform' && data?.type === 'resize') {
    document.getElementById('thesis-iframe').style.height = `${data.height}px`
  }
})
```

If the host page does not listen for these messages, the iframe simply
scrolls internally — nothing breaks.

## Cookies and third-party-cookie caveats

For sessions to work inside a cross-site iframe, the NextAuth cookies are
issued with `SameSite=None; Secure` when the app is served over HTTPS
(cookie names are unchanged, so existing sessions stay valid; local HTTP
development keeps the `Lax` defaults).

Note that some browsers (Safari, and progressively Chrome) block
*third-party* cookies entirely. This only matters when the embedding page
is on a **different site** (different eTLD+1). Embedding within
`*.uzh.ch` — e.g. `www.df.uzh.ch` embedding `theses.df.uzh.ch` — is
same-site and works in all browsers. For genuinely cross-site embedding,
signed-in functionality may require the browser to allow third-party
cookies; the public (signed-out) proposal list works regardless.
