# Read Before Starting

This backend was made for [FMP Reborn](https://discord.gg/run22HRWn9), an OG Fortnite hosting server, but was released publicly to show how XMPP/TCP works on older builds. With this release, I hope to see this utilised by other projects so playing S1-S3 builds can feel more authentic to the original experience.

Thanks to the people behind [LawinServerV2](https://github.com/Lawin0129/LawinServerV2) and [Reload](https://github.com/Project-Reload/Reload-Backend) for their work in allowing old Fortnite to still be accessible via the frontend, this backend is inspired by them and uses small parts of their code to make this backend function to the extent it does.

Also thanks to the people who told me about this and helped me to get this working fully (as well as Claude and ChatGPT).

If you'd like to make a pull request to help make the backend better, you're more than welcome to (the code is overall just messy and things like auth and certain endpoints are missing/incomplete).

---

## Requirements
- [Openfire](https://www.igniterealtime.org/downloads/#openfire) (This does most of the heavy lifting when it comes to XMPP)
- [Knowledge on port forwarding](https://www.noip.com/support/knowledgebase/general-port-forwarding-guide) or [Radmin](https://www.radmin-vpn.com/) (Radmin is easier)
- [A Java that suppors TLS 1](https://adoptium.net/en-GB/temurin/releases) (I use Java 17)
- [A domain](https://www.123-reg.co.uk/) (I use 123 Reg for my domain, there's plenty of options to suit different price ranges)
- [SSL certificates](https://zerossl.com/) (You get a 90 day certificate for free)
- [Cloudflare](https://dash.cloudflare.com/) (This is just to redirect the domain back to your servers)
