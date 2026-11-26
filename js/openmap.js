const UUID_REGEX = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const DATASET_PATH = /^\/(?:openmap|carteouverte)(?:\/(?:en|fr))?\/([^/]+)\/?$/;
const LEGACY_PATH = /^\/(?:(?:openmap|carteouverte)\/)?(?:en|fr)(?:\.html)?\/?$/;
const VIEWER_PATHS = { en: '/openmap/en', fr: '/carteouverte/fr' };
const langcode = document.documentElement.lang.toLowerCase().startsWith('fr') ? 'fr' : 'en';

function parseUuids(segment = '') {
    // Decode URL-escaped separators (such as %2C) before splitting the list.
    try {
        segment = decodeURIComponent(segment);
    } catch {
        return [];
    }
    return segment.split(',').map(uuid => uuid.trim()).filter(uuid => UUID_REGEX.test(uuid));
}

function viewerPath(lang, uuids) {
    return VIEWER_PATHS[lang] + (uuids.length ? '/' + uuids.join(',') : '');
}

const { pathname, search } = window.location;
const usesLegacyPath = LEGACY_PATH.test(pathname);
const datasetUuids = parseUuids(usesLegacyPath
    ? window.location.hash.slice(1)
    : pathname.match(DATASET_PATH)?.[1]);

// Old bookmarks still load the same layers. Replace the URL before analytics initializes.
if (usesLegacyPath && datasetUuids.length) {
    window.history.replaceState(window.history.state, '', viewerPath(langcode, datasetUuids) + search);
}

function syncLanguageSwitcher() {
    const targetLang = langcode === 'en' ? 'fr' : 'en';
    const langLink = document.querySelector(`#wb-lng a[hreflang='${targetLang}']`);
    if (langLink) {
        langLink.href = viewerPath(targetLang, datasetUuids) + search;
    }
}

// Retrieve title for dataset-list using CKAN API
function renderDatasetLink(uuid) {
    const apiUrl = new URL('https://open.canada.ca/data/api/action/package_show');
    apiUrl.searchParams.set('id', uuid);

    return fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (!data.success) {
                console.error('API Error: ', data.error?.message);
                return;
            }

            const title = data.result.title_translated;
            const ul = document.getElementById('dataset-list');
            if (!ul) return;
            const li = document.createElement("li");
            const link = document.createElement("a");
            link.href = `https://open.canada.ca/data/${langcode}/dataset/${uuid}`;
            const titleKey = langcode.startsWith('en') ? ['en', 'en-t-fr'] : ['fr', 'fr-t-en'];
            link.textContent = title[titleKey[0]] ?? title[titleKey[1]] ?? uuid;
            li.appendChild(link);
            ul.appendChild(li);

            // generate a page view event in GA4
            const pagePath = viewerPath(langcode, [uuid]);
            gtag('event', 'page_view', {
                page_location: `${window.location.origin}${pagePath}`,
                page_path: pagePath,
                page_title: document.title + '-' + link.textContent.trim()
            });

        })
        .catch(error => {
            console.error('Failed to load data. Fetch error:', error);
    });
}

async function getTitles(uuids) {
    for (const uuid of uuids) {
        await renderDatasetLink(uuid);
    }
}

// Add the Web analytics URL
function getAnalyticsUrl(uuids) {
    const filters = uuids
        .map(id => `id:${id}`)
        .join('|');
    const ul = document.getElementById('web-analytics');
    if (!ul) return;
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = `https://open.canada.ca/data/${langcode}/dataset/`
        + '2916fad5-ebcc-4c86-b0f3-4f619b29f412/resource/15eeafa2-c331-44e7-b37f-d0d54a51d2eb?filters='
        + encodeURIComponent(filters);
    link.textContent =
        langcode === 'fr'
            ? "Les données de mesure d'audience"
            : "Web analytics data";
    li.appendChild(link);
    ul.appendChild(li);
}

function renderDatasets() {
    syncLanguageSwitcher();
    if (datasetUuids.length) {
        getTitles(datasetUuids);
        getAnalyticsUrl(datasetUuids);
    }
}
window.addEventListener('DOMContentLoaded', renderDatasets);

window.addEventListener('hashchange', () => {
    if (LEGACY_PATH.test(window.location.pathname) && parseUuids(window.location.hash.slice(1)).length) {
        // A reload applies the new layer list through the same initialization path.
        window.location.reload();
    }
});
