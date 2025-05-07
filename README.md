# tuva_terminology_viewer

This is a proof-of-concept for viewing the Tuva Terminology files via a web interface. 

### Version 0.1.0

### Install the `gh-pages` package.

`npm install --save-dev gh-pages`

### Update `package.json`

Add the following configurations to your package.json file:

- Set the homepage field to point to your GitHub Pages URL. Replace username with your GitHub username and repo-name with your repository name:
`"homepage": "https://username.github.io/repo-name"`

- Add deployment scripts under the scripts section:
`"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d build"
}`

- Deploy the App
Run the deployment command:
`npm run deploy`

Enable GitHub Pages in Repository Settings  
- Go to your repository on GitHub (e.g., https://github.com/username/repo-name).
- Click on Settings.
- Scroll to the Pages section.
- Under Source, select the gh-pages branch and set the folder to / (root).
- Click Save.
