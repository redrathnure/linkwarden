# Fork Info

A staging repository for Linkwarden improvements. A following changes were done here:

1. Docker image is run with node:node user (default user for official nodejs images). By default it's `1000:1000` however it may be adjusted using `PUID` and `PGID` args.
2. It's possible to run contained with `-u UID:GID` params. Please note it is **not** the same as `PUID:PGID` args and it is **not** recommended at all (see description below)
3. ~~Experimental build with node.js 20 (✓)~~
4. Images were optimized for Docker BuildX toolset (reorder docker layers, use cache mount points etc)

## Some of the Issues Addressed

### Rootless Container

Why: to not run process with under privileged user, to avoid creation file with root:root chown and to make possibility to run image(s) from predefined (non root) host user.
Problem: PostgresSQL images are ready for rootless run. Just use `-u` arg or `user: ` compose directive. However official Linkwarden image have multiple file permissions related problems.
How to fix:
Option 1: The custom images run under node:node (1000:1000) user by default. No any process with privileged user context anymore. Just run Docker/Docker Compose as usual without any extra parameters. All internal files are ready for this, all new files will be created with `1000:1000` owner.
Option 2. The custom images support `PUID` and `PGID` environment arguments to specify desired UID and GID. Please make sure that shared mount points has right permissions, all new files will be created with `PUID:PGID` owner.

An example of docker compose file:

```
name: linkwarden
services:
  postgres:
    image: postgres:16-alpine
    env_file: .env
    restart: always
    volumes:
      - ./pgdata:/var/lib/postgresql/data
    user: "${UID}:${GID}" # UID and GID must be specified in .env file, otherwise put the values here

  linkwarden:
    image: ghcr.io/linkwarden/linkwarden:latest
    env_file: .env
    environment:
      - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/postgres
      - PUID=${UID:-1000} # UID and GID must be specified in .env file, otherwise put the values here
      - PGID=${UID:-1000} # UID and GID must be specified in .env file, otherwise put the values here
    restart: always
    ports:
      - 3000:3000
    volumes:
      - ./data:/data/data
    depends_on:
      - postgres
```

## Image Tags/Versions

Node.js 22 (Debian Bookworm based):

* `latest`
* `1-beta`, `1.2-beta`, `1.2.3-beta` 
* `1.2.3-beta.13.g15da68da8` where the `13.g15da68da8` part points to the git commit where the images have been built from.
* tags with a `-node22` suffix.

~~Node.js 20 (Debian Bookworm based): same as nodejs 18 but with `-node20` suffix.~~

# Original Project Readme


<div align="center">
  <img src="./assets/logo.png" width="100px" />
  <h1>Linkwarden</h1>
  <h3>Bookmark Preservation for Individuals and Teams</h3>

<a href="https://discord.com/invite/CtuYV47nuJ"><img src="https://img.shields.io/discord/1117993124669702164?logo=discord&style=flat" alt="Discord"></a>
<a href="https://twitter.com/LinkwardenHQ"><img src="https://img.shields.io/twitter/follow/linkwarden" alt="Twitter"></a> <a href="https://news.ycombinator.com/item?id=36942308"><img src="https://img.shields.io/badge/Hacker%20News-280-%23FF6600"></img></a>

<a href="https://github.com/linkwarden/linkwarden/releases"><img alt="GitHub release" src="https://img.shields.io/github/v/release/linkwarden/linkwarden"></a>
<a href="https://opencollective.com/linkwarden"><img src="https://img.shields.io/opencollective/all/linkwarden" alt="Open Collective"></a>

</div>

<div align='center'>

[« LAUNCH DEMO »](https://demo.linkwarden.app)

[Cloud](https://cloud.linkwarden.app) · [Website](https://linkwarden.app) · [Features](https://github.com/linkwarden/linkwarden#features) · [Docs](https://docs.linkwarden.app)

</div>

## Intro & motivation

**Linkwarden is a self-hosted, open-source collaborative bookmark manager to collect, organize and archive webpages.**

The objective is to organize useful webpages and articles you find across the web in one place, and since useful webpages can go away (see the inevitability of [Link Rot](https://www.howtogeek.com/786227/what-is-link-rot-and-how-does-it-threaten-the-web/)), Linkwarden also saves a copy of each webpage as a Screenshot and PDF, ensuring accessibility even if the original content is no longer available.

Additionally, Linkwarden is designed with collaboration in mind, sharing links with the public and/or allowing multiple users to work together seamlessly.

> [!TIP]  
> Our official [Cloud](https://linkwarden.app/#pricing) offering provides the simplest way to begin using Linkwarden and it's the preferred choice for many due to its time-saving benefits. <br> Your subscription supports our hosting infrastructure and ongoing development. <br> Alternatively, if you prefer self-hosting Linkwarden, you can do so by following our [Installation documentation](https://docs.linkwarden.app/self-hosting/installation).

<img src="./assets/dashboard.png" />

<div align="center">
<img src="./assets/all_links.jpg" width="23%" />

<img src="./assets/list_view.jpg" width="23%" />

<img src="./assets/all_collections.jpg" width="23%" />

<img src="./assets/manage_team.jpg" width="23%" />

<img src="./assets/readable_view.jpg" width="23%" />

<img src="./assets/preserved_formats.jpg" width="23%" />

<img src="./assets/public_page.jpg" width="23%" />

<img src="./assets/light_dashboard.jpg" width="23%" />
</div>

## Features

- 📸 Auto capture a screenshot, PDF, single html file, and readable view of each webpage.
- 🏛️ Send your webpage to Wayback Machine ([archive.org](https://archive.org)) for a snapshot. (Optional)
- ✨ Local AI Tagging to automatically tag your links based on their content (Optional).
- 📂 Organize links by collection, sub-collection, name, description and multiple tags.
- 👥 Collaborate on gathering links in a collection.
- 🎛️ Customize the permissions of each member.
- 🌐 Share your collected links and preserved formats with the world.
- 📌 Pin your favorite links to dashboard.
- 🔍 Full text search, filter and sort for easy retrieval.
- 📱 Responsive design and supports most modern browsers.
- 🌓 Dark/Light mode support.
- 🧩 Browser extension. [Star it here!](https://github.com/linkwarden/browser-extension)
- 🔄 Browser Synchronization (using [Floccus](https://floccus.org)!)
- ⬇️ Import and export your bookmarks.
- 🔐 SSO integration. (Enterprise and Self-hosted users only)
- 📦 Installable Progressive Web App (PWA).
- 🍎 iOS Shortcut to save Links to Linkwarden.
- 🔑 API keys.
- ✅ Bulk actions.
- 👥 User administration.
- 🌐 Support for Other Languages (i18n).
- 📁 Image and PDF Uploads.
- 🎨 Custom Icons for Links and Collections.
- 🔔 RSS Feed Subscription.
- ✨ And many more features. (Literally!)

## Like what we're doing? Give us a Star ⭐

![Star Us](https://raw.githubusercontent.com/linkwarden/linkwarden/main/assets/star_repo.gif)

## We're building our Community 🌐

Join and follow us in the following platforms to stay up to date about the most recent features and for support:

<a href="https://discord.com/invite/CtuYV47nuJ"><img src="https://img.shields.io/discord/1117993124669702164?logo=discord&style=flat" alt="Discord"></a>

<a href="https://twitter.com/LinkwardenHQ"><img src="https://img.shields.io/twitter/follow/linkwarden" alt="Twitter"></a>

<a href="https://fosstodon.org/@linkwarden"><img src="https://img.shields.io/mastodon/follow/110748840237143200?domain=https%3A%2F%2Ffosstodon.org" alt="Mastodon"></a>

## Suggestions

We _usually_ go after the [popular suggestions](https://github.com/linkwarden/linkwarden/issues?q=is%3Aissue+is%3Aopen+sort%3Areactions-%2B1-desc). Feel free to open a [new issue](https://github.com/linkwarden/linkwarden/issues/new?assignees=&labels=enhancement&projects=&template=feature_request.md&title=) to suggest one - others might be interested too! :)

## Roadmap

Make sure to check out our [public roadmap](https://github.com/orgs/linkwarden/projects/1).

## Community Projects

Here are some community-maintained projects that are built around Linkwarden:

- [My Links](https://apps.apple.com/ca/app/my-links-for-linkwarden/id6504573402) - iOS and MacOS Apps, maintained by [JGeek00](https://github.com/JGeek00).
- [LinkDroid](https://fossdroid.com/a/linkdroid-for-linkwarden.html) - Android App with share sheet integration, [source code](https://github.com/Dacid99/LinkDroid-for-Linkwarden).
- [LinkGuardian](https://github.com/Elbullazul/LinkGuardian) - An Android client for Linkwarden. Built with Kotlin and Jetpack compose.
- [StarWarden](https://github.com/rtuszik/starwarden) - A browser extension to save your starred GitHub repositories to Linkwarden.

## Development

If you want to contribute, Thanks! Start by checking our [public roadmap](https://github.com/orgs/linkwarden/projects/1), there you'll see a [README for contributers](https://github.com/orgs/linkwarden/projects/1?pane=issue&itemId=34708277) for the rest of the info on how to contribute and the main tech stack.

## Security

If you found a security vulnerability, please do **not** create a public issue, instead send an email to [security@linkwarden.app](mailto:security@linkwarden.app) stating the vulnerability. Thanks!

## Support <3

Other than using our official [Cloud](https://linkwarden.app/#pricing) offering, any [donations](https://opencollective.com/linkwarden) are highly appreciated as well!

Here are the other ways to support/cheer this project:

- Starring this repository.
- Joining us on [Discord](https://discord.com/invite/CtuYV47nuJ).
- Referring Linkwarden to a friend.

If you did any of the above, Thanksss! Otherwise thanks.

## Thanks to All the Contributors 💪

Huge thanks to these guys for spending their time helping Linkwarden grow. They rock! ⚡️

<img src="https://contributors-img.web.app/image?repo=linkwarden/linkwarden" alt="Contributors"/>
