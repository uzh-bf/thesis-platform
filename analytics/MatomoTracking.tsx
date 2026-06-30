import Script from 'next/script'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

const MATOMO_ALLOWED_HOST = 'theses.df.uzh.ch'
const MATOMO_BASE_URL = 'https://webstats.uzh.ch/'
const MATOMO_SCRIPT_BASE_URL = '//webstats.uzh.ch/'
const MATOMO_SITE_ID = '601'

type MatomoCommand = Array<string | number | boolean>

declare global {
  var _paq: MatomoCommand[] | undefined
}

const isDfWebstatsHost = (hostname: string) => hostname === MATOMO_ALLOWED_HOST

function MatomoTracking() {
  const router = useRouter()

  useEffect(() => {
    const trackRouteChange = (url: string) => {
      if (!isDfWebstatsHost(globalThis.location.hostname)) return

      globalThis._paq = globalThis._paq || []
      globalThis._paq.push([
        'setCustomUrl',
        new URL(url, globalThis.location.origin).toString(),
      ])
      globalThis._paq.push(['setDocumentTitle', globalThis.document.title])
      globalThis._paq.push(['trackPageView'])
    }

    router.events.on('routeChangeComplete', trackRouteChange)

    return () => {
      router.events.off('routeChangeComplete', trackRouteChange)
    }
  }, [router.events])

  return (
    <Script id="matomo-webstats" strategy="afterInteractive">
      {`
        (function() {
          if (globalThis.location.hostname !== '${MATOMO_ALLOWED_HOST}') return;

          globalThis._paq = globalThis._paq || [];
          globalThis._paq.push(['setAPIUrl', '${MATOMO_BASE_URL}']);
          globalThis._paq.push(['trackPageView']);
          globalThis._paq.push(['enableLinkTracking']);

          var u='${MATOMO_SCRIPT_BASE_URL}';
          globalThis._paq.push(['setTrackerUrl', u+'piwik.php']);
          globalThis._paq.push(['setSiteId', '${MATOMO_SITE_ID}']);

          var d=globalThis.document;
          var g=d.createElement('script');
          var s=d.getElementsByTagName('script')[0];
          g.type='text/javascript';
          g.async=true;
          g.defer=true;
          g.src=u+'piwik.js';
          s.parentNode.insertBefore(g,s);
        })();
      `}
    </Script>
  )
}

export default MatomoTracking
