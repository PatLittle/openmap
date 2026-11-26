# openmap
Open Maps Viewer | Visualisateur de Cartes ouvertes

## Viewer URLs

| Language | With an explicit language segment | With the language inferred |
| --- | --- | --- |
| English | `/openmap/en/{uuid}` | `/openmap/{uuid}` |
| French | `/carteouverte/fr/{uuid}` | `/carteouverte/{uuid}` |

Join multiple dataset UUIDs with commas in the final segment. Legacy links
such as `/openmap/en.html#{uuid}` open the same dataset and update the browser
address to the new path.

Netlify serves these routes through the `_redirects` file in the publish
directory. On other hosts, configure internal rewrites to serve `en.html`
for the English routes and `fr.html` for the French routes, keeping the public
path in the address bar. Both pages use shared assets under `/openmap/`.
Keep the old HTML entry points and exclude asset paths from viewer rewrites.
