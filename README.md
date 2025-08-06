# Read Before Starting

### This guide isn't perfect, it was done through a lot of testing and experimenting and definitely isn't the most efficient way to do this. Right now it's catered to this specific backend, but with some modifications it'll work with others.

The purpose for this backend was purely for testing XMPP/TCP connections on older builds, this backend is NOT optimised or 1:1 to the real Fortnite servers, so it probably has a few bugs.

This backend was made for [FMP Reborn](https://discord.gg/run22HRWn9), an OG Fortnite hosting server, but was released publicly to show how XMPP/TCP works on older builds. With this release, I hope to see this utilised by other projects so playing S1-S3 builds can feel more authentic to the original experience.

Thanks to the people behind [LawinServerV2](https://github.com/Lawin0129/LawinServerV2) and [Reload](https://github.com/Project-Reload/Reload-Backend) for their work in allowing old Fortnite to still be accessible, this backend is inspired by them and uses small parts of their code to make this backend function to the extent it does.

Also thanks to the people who told me about this and helped me to get this working fully (as well as Claude and ChatGPT).

If you'd like to make a pull request to help make the backend better, you're more than welcome to (the code is overall just messy and certain endpoints are missing/incomplete or just badly coded).

# Features
Currently only made for chapter 1 versions.

## XMPP/TCP
- [x] Managing friends
- [x] Gifting
- [x] Parties
- [x] Global chat (Most builds)
- [x] Whispering
- [x] Matchmaking (Needs to be fixed on S4)

## Item shop
- [x] Purchasing
- [x] Gifting
- [ ] Auto-rotate (Times are bugged)
- [x] Refunding

## Cosmetics
- [x] Equipping cosmetics
- [x] Cosmetic styles
- [x] Favouriting cosmetics
- [x] Random cosmetics

## Battlepass
- [x] Purchasing
- [x] Purchasing bundle
- [x] Purchasing tiers

## Others
- [x] Settings save (On PC at least)
- [x] News tab (Can be changed per hoster)
- [x] Custom matchmaking keys (/key command for S1-S2)

# Proof
## Season 1 (v1.7.2) - Screenshot Taken 18/7/25
<img width="2560" height="1440" alt="474220997-a3d82b42-d9cf-405d-88e3-62a4435e7c8a" src="https://github.com/user-attachments/assets/fceed0ed-7d5d-47af-8423-6d5e7e8fd905" />

## Season 2 (v1.11) - Screenshot Taken 31/7/25
<img width="2560" height="1440" alt="474220359-76f03e26-cc65-48d2-ada0-23183fce34b0" src="https://github.com/user-attachments/assets/7b00b777-a5aa-4393-a66f-6d1f1526677b" />

#### Thanks to ThatDefaultBTW for helping me test this out.

# Requirements
- [Openfire](https://www.igniterealtime.org/downloads/#openfire) (This does most of the heavy lifting when it comes to XMPP/TCP)
- [Knowledge on port forwarding](https://www.noip.com/support/knowledgebase/general-port-forwarding-guide) (So users can access Openfire)
- [Java that supports TLS 1](https://adoptium.net/en-GB/temurin/releases) (I use Java 17)
- [Domain](https://www.123-reg.co.uk/) (I use 123-Reg for mine, but there's other options out there)
- [SSL certificates](https://zerossl.com/) (Must be trusted by Fortnite for it to work, use ZeroSSL)

## SSL Certificates
You will need your own domain for this, I won't be covering how to get one in this guide but it's easy to find one and often you can get them for insanely cheap. I got mine from [123-Reg](https://www.123-reg.co.uk/) and recommend it if you're cheap like me.

After obtaining a domain, go to [ZeroSSL](https://zerossl.com/) and request a certificate for a subdomain. Follow the steps to verify you own the domain and then you will be granted the certificates. You'll end up with three files called `ca_bundle.crt`, `certificate.crt` and `private.key`. You'll need these for later when we setup Openfire.

To avoid confusion, I will be using `test.rhysbot.com` throughout this guide, so every time you see my domain, just replace it with yours (e.g. `xmpp.example.com`).

## Cloudflare
This part is simple, just login to [Cloudflare](https://dash.cloudflare.com/) and register your domain.

After verifying your domain, go to the DNS tab and copy what I've done in the image below, replace the IP with your public IP or an IP that is publicly accessible. If you don't know your IP then you can google it.

<img width="1262" height="421" alt="28b32fe0-52a1-49d8-98f6-e3dc5d3c11b4" src="https://github.com/user-attachments/assets/16ce7970-2342-4f98-be29-63f9ef2f797c" />

For TCP to work correctly, you need to open some ports.

- Openfire needs - 5222, 9090, 9091.

Chances are I may have missed a port, if I have then let me know.

## Modifying Java
This part might be a bit confusing, but look for your Java directory and go to `conf > security` and find the `java.security` file. The directory will vary depending on your version of Java, for example mine was at `C:\Program Files\Eclipse Adoptium\jdk-17.0.15.6-hotspot\conf\security`.

Open `java.security` with notepad with administrator and search for `tls.disabledAlgorithms` (use CTRL+F to search), you will end up coming across this line and make sure you remove `TLSv1` and `TLSv1.1` from it. Make sure you edit the actual line and not the example note above it.

<img width="658" height="107" alt="999ab534-1a65-4445-b069-73623d27c97f" src="https://github.com/user-attachments/assets/0bbe88cd-8f6a-41cf-88d0-fccb1764a692" />

Once done, save and close this file and that's the Java part out of the way.

## Setting Up Openfire
Download and install [Openfire](https://www.igniterealtime.org/downloads/), v5.0.1 is the latest at the time of writing this.

**Follow along very carefully with this part, one wrong setup could result in TCP not working like intended.
A lesson I learnt that going back to a previous step in the setup can reset values back to default.**

Firstly, you need to put your domain in here and make sure the rest of the settings are like mine

<img width="569" height="445" alt="76456ec5-5dbc-4bf9-9835-30acb73fa81a" src="https://github.com/user-attachments/assets/6acf5000-f2f1-4062-8661-20a12380a52d" />

---

Set to an embedded database.

<img width="396" height="229" alt="d706ecaf-3ca6-4b60-b5bc-8d5c68160b51" src="https://github.com/user-attachments/assets/ddfb6c83-eef7-4af8-a1f7-dc27d0a5ce8a" />

---

Leave as default.

<img width="337" height="252" alt="b1b960b1-812a-4e2a-843f-76589ec3b1ab" src="https://github.com/user-attachments/assets/153cff96-f0fa-419b-82a5-ad269a54da89" />

---

For this, I've just used the password `1234`.

<img width="475" height="244" alt="953fa8bc-f1db-4f9d-82c9-5933806f593d" src="https://github.com/user-attachments/assets/335c14e9-c163-4f99-9922-8f815c14cd26" />

---

This should be the setup done, now we can move onto configuring some settings.

## Configuring Openfire
Go to `Server > Server Manager > System Properties` and change the `adminConsole.access.allow-wildcards-in-excludes` property to `true`. This will allow the Rest API to work correctly.

<img width="822" height="656" alt="d3004e99-493a-4a9c-a52c-943b86db73f5" src="https://github.com/user-attachments/assets/8b910a56-3f42-487b-b122-c2ebcec34a36" />

---

Go to `Server > Server Settings > Client Connections` and click `Advanced configuration...`

<img width="256" height="199" alt="0d57007b-e974-46cf-a437-54beda0d08da" src="https://github.com/user-attachments/assets/ff36d9ce-a83d-4deb-a104-cb539c3a88ba" />

Make sure these boxes are ticked then save.

<img width="225" height="309" alt="c7bb445e-7845-4a3f-aad4-3afde9db9d4f" src="https://github.com/user-attachments/assets/40ee7d40-28d7-407e-b72d-8baee9ee55dc" />

---

Go to `Plugins > Available Plugins` and install `REST API`

<img width="301" height="57" alt="8b5153de-5b8e-48f3-9cab-6d57bf934901" src="https://github.com/user-attachments/assets/7a1fd1bc-0c22-4473-8a89-8c0c8fbf8c3a" />

Go back `Server > Server Settings` and you should see a `Rest API` button on the left.

<img width="147" height="39" alt="62dca7f0-f584-4fc8-b72a-db0eab42d966" src="https://github.com/user-attachments/assets/2d234bce-be58-4e7d-9594-b699b768babd" />

Click this and copy my settings exactly.

<img width="760" height="576" alt="d2ca2cb1-dae8-4537-945a-bd256615d9fa" src="https://github.com/user-attachments/assets/014a5fea-335c-4c8c-92bb-8c34c9bd1745" />

---

If done correctly, the Rest API should be ready to work with the backend.

## Configuring Openfire SSL/TLS Certificates
Pay close attention to the order I put these in, I had issues myself with this for ages all because I had the files in the wrong order.

Go to `Server > TLS Certificates` and click `Manage Store Contents` (the top one).

<img width="424" height="479" alt="a364c94a-9c70-42d3-8e95-2a876f9d04a1" src="https://github.com/user-attachments/assets/5cdf6e1a-048d-44ef-ae62-7f1bb7070029" />

By default, a self-signed certificate has been generated. Delete this.

<img width="1559" height="389" alt="617d838a-80f4-46a0-9be3-4b485390567c" src="https://github.com/user-attachments/assets/013ab734-3a0d-41d5-8dea-72bc66dc7ce1" />

Now click this link here.

<img width="103" height="38" alt="6d35ea0f-c183-4ada-8cd2-5a9df9f794a5" src="https://github.com/user-attachments/assets/16bc181f-800d-47a6-ad78-996360849bbe" />

Paste the contents of the files you got from ZeroSSL earlier. It's painfully important it's in the right order, I don't want you to encounter the same issues I did.

In the second box `ca_bundle.crt` content must be ABOVE the `certificate.crt` content while both being in the same box

<img width="814" height="795" alt="5d949774-e463-4f1a-80ba-fd321640612c" src="https://github.com/user-attachments/assets/b50e87a7-4bb4-430e-9409-a4cc014ffc66" />

<img width="813" height="796" alt="13651c02-f902-443b-9122-e251534d28ee" src="https://github.com/user-attachments/assets/e81763e0-cf37-4941-a4d1-e7fb098dd1d9" />

This should be your certificates all set up now.

## Openfire User Presence
To allow users to share their presence (status) with eachother, you must go to `Users/Groups > Groups` and create a new group called `users`.

<img width="578" height="416" alt="58d12259-ec29-4046-bfe2-e9b875543c0a" src="https://github.com/user-attachments/assets/d69cf322-05bf-4c3d-869e-845e6f2437c4" />

Once created, edit the group and copy what I've done.

<img width="440" height="445" alt="a2d9b5bc-b2b6-4763-8e1f-3677b0cc3986" src="https://github.com/user-attachments/assets/3d73a6b8-82b8-4ec1-8b01-94d6909fd7ab" />

---

For things like live friend requests and gifts, it requires a specific user to be created on Openfire.

The user MUST be called `xmpp-admin` with admin permissions, the password can be anything but **remember it for later**.

<img width="372" height="309" alt="d9a0b49a-48da-407a-ad48-1efe40ef995b" src="https://github.com/user-attachments/assets/bf5c3c7a-2054-4b06-bbcd-f1c1a617392e" />

## Configuring The Backend
My best advice is to restart Openfire after you've configured everything to ensure everythings working and updated (search for Openfire in task manager and close it).

Run `install.bat` to download all the packages, and then run `run.bat`. Running `run.bat` once will generate the `config.json` file, after this make sure you modify `config.json` and not `config_template.json`.

Modify the `config.json` to fit your needs. Remember that the `xmpp.address` at the top should be a public one people can access, such as a [Radmin](https://www.radmin-vpn.com/) IP.

<img width="411" height="598" alt="be95e983-f867-4ca7-b631-5456aa24601f" src="https://github.com/user-attachments/assets/e78aacab-75e3-4d7d-980a-1b079b7d1994" />

The main thing we need to modify is the `Openfire` object at the botton.

Keep `admin_username` as the same, and change the `admin_password` to be the one you used for `xmpp-admin` on Openfire. Now the `domain` should be the one setup with ZeroSSL, so mine would be `test.rhysbot.com` for example.

<img width="284" height="112" alt="f2172d73-1fc7-4273-89da-d2b83a8cd7f9" src="https://github.com/user-attachments/assets/e2847e9e-b601-4cac-a1f1-f327e73f04cb" />

Now run `run.bat` again and if everything's worked correctly, TCP should be working when you load the game. TCP services aren't limited to S1-S3, they also work up until S10 from my own testing (and maybe beyond).

---

You also need to modify `DefaultEngine.ini` in the `cloudstorage` folder. Just change `Domain` and `ServerAddr` to be your domain.

<img width="238" height="112" alt="426faa02-9288-4bce-8a55-cb249dac0dc1" src="https://github.com/user-attachments/assets/ab96cdba-6550-4361-b664-a601c0e15cf1" />

---

## "It still says I'm offline!"
Chances are it's a client issue. If using something like Fiddler, make sure your settings are like this. Make sure to press `Trust Root Certificate`.

<img width="710" height="381" alt="image" src="https://github.com/user-attachments/assets/df7a7c61-be66-4b28-836c-23f45bae1811" />

For the script, you can use your domain instead of an IP address (Make sure to change `http` > `https`).

```csharp
import System;
import System.Web;
import System.Windows.Forms;
import Fiddler;

class Handlers
{ 
    static function OnBeforeRequest(oSession: Session) {
        if (oSession.hostname.Contains(".ol.epicgames.com")) {
            if (oSession.HTTPMethodIs("CONNECT"))
            {
                oSession["x-replywithtunnel"] = "FortniteTunnel";
                return;
            }
            oSession.fullUrl = "https://rhysbot.com:8080" + oSession.PathAndQuery;
        }
    }
}
```

---

## Still not working?
Chances are either I might've forgotten to put something in the guide or you've done something wrong. But that's not a problem, either send a message in our [Discord server](https://discord.gg/run22HRWn9) or create an issue request on this repo.
