import Script from 'next/script'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

const MATOMO_BASE_URL = 'https://webstats.uzh.ch/'
const MATOMO_SCRIPT_BASE_URL = '//webstats.uzh.ch/'
const MATOMO_SITE_ID = '601'
const MATOMO_TRACKED_DEPARTMENT = 'DF'
const MATOMO_ALLOWED_HOSTS = ['theses.df.uzh.ch', 'theses.bf.uzh.ch']

type MatomoCommand = Array<string | number | boolean>

declare global {
  interface Window {
    _paq?: MatomoCommand[]
  }
}

const isDfWebstatsHost = (hostname: string) =>
  MATOMO_ALLOWED_HOSTS.includes(hostname)

const shouldRenderWebstats =
  process.env.NEXT_PUBLIC_DEPARTMENT_NAME === MATOMO_TRACKED_DEPARTMENT

function MatomoTrackingEnabled() {
  const router = useRouter()

  useEffect(() => {
    const trackRouteChange = (url: string) => {
      if (!isDfWebstatsHost(window.location.hostname)) return

      window._paq = window._paq || []
      window._paq.push([
        'setCustomUrl',
        new URL(url, window.location.origin).toString(),
      ])
      window._paq.push(['setDocumentTitle', document.title])
      window._paq.push(['trackPageView'])
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
          var allowedHosts = ${JSON.stringify(MATOMO_ALLOWED_HOSTS)};
          if (!allowedHosts.includes(window.location.hostname)) return;

          window._paq = window._paq || [];
          window._paq.push(['setAPIUrl', '${MATOMO_BASE_URL}']);
          window._paq.push(['trackPageView']);
          window._paq.push(['enableLinkTracking']);

          var u='${MATOMO_SCRIPT_BASE_URL}';
          window._paq.push(['setTrackerUrl', u+'piwik.php']);
          window._paq.push(['setSiteId', '${MATOMO_SITE_ID}']);

          var d=document;
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

function MatomoTracking() {
  if (!shouldRenderWebstats) return null

  return <MatomoTrackingEnabled />
}

export default MatomoTracking
