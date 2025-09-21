# 25 Bananas Birthday Invite

This repo contains a single-page invitation site for the 25th birthday celebration. It is a simple static site built with HTML, CSS, and vanilla JavaScript.

## Local preview

Open `index.html` in any modern browser. No additional build steps are required.

## Hosting with GitHub Pages

1. Create a GitHub repository (for example `nisse/25bananer`) and push this project to the `main` branch.
2. In the repository, open **Settings → Pages** and set the **Source** to **GitHub Actions**.
3. Go to **Settings → Actions → General** and make sure "Allow all actions and reusable workflows" is enabled (the default for personal repositories).
4. Push to `main` (or trigger the workflow manually from the **Actions** tab). The workflow defined in `.github/workflows/deploy.yml` will upload the contents of the repository and publish them to GitHub Pages.
5. When the workflow finishes, the public site URL will appear in the workflow run summary and on the **Settings → Pages** screen.

If your default branch is not `main`, update the `branches` list in `.github/workflows/deploy.yml` accordingly.

## Handling RSVP submissions

The site posts RSVP-data to a Formspree endpoint. To start receiving emails:

1. Create a free account at [Formspree](https://formspree.io/) and add a new form (recommended name `oktoberfest25`).
2. Copy the form ID (looks like `https://formspree.io/f/xxxxxx`).
3. The RSVP script is already configured with your endpoint (`FORM_ENDPOINT = "https://formspree.io/f/xldprjdq"`). Update it if you change form later.
4. Deploy the site (push to `main`). On first submission, Formspree will send a confirmation email—approve it to start receiving RSVPs.
5. Optionally configure spam protection, auto-replies or webhook forwarding inside your Formspree dashboard.

Without configuring Formspree the form will still save responses to `localStorage`, but the RSVP will not reach you.

## Hosting with Docker (for Proxmox or any VPS)

1. Install Docker on the target machine (for Proxmox you can use a Debian/Ubuntu LXC or VM and follow Docker's install script).
2. Copy the project files to the server (for example with `git clone` or `scp`).
3. Build the image:
   ```bash
   docker build -t oktoberfest-invite .
   ```
4. Run the container:
   ```bash
   docker run -d --name oktoberfest-invite -p 80:80 oktoberfest-invite
   ```
5. Browse to the server's IP (or your domain) over HTTP and you should see the invitation page.

The provided `nginx.conf` keeps things simple; adjust it if you want HTTPS termination behind a reverse proxy like Traefik, Caddy, or Nginx on the host.

## Alternative static hosts

If you prefer a hosted service instead of managing a server:

- **Netlify** – drag & drop the folder or connect the GitHub repo; set build command to `npm run build` (not needed here) and publish directory to `/`.
- **Vercel** – import the repo, choose "Other" framework, publish directory `/`.
- **Cloudflare Pages** – create a project from Git, leave build command empty, set output directory to `/`.

All of these options provide HTTPS automatically and integrate with your GitHub repo for continuous deployment.

## Custom domain (optional)

After the site is live you can add a custom domain under **Settings → Pages → Custom domain** (or the equivalent in Netlify/Vercel/Cloudflare), then create the required DNS records with your domain provider.



