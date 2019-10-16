// This needs to be runed once to get verify letsencrypt certification
// https://flaviocopes.com/express-letsencrypt-ssl/
// https://itnext.io/node-express-letsencrypt-generate-a-free-ssl-certificate-and-run-an-https-server-in-5-minutes-a730fbe528ca

const express = require('express')
const app = express()

app.use(express.static(__dirname, { dotfiles: 'allow' } ));

app.listen(80, () => {
  console.log('HTTP server running on port 80');
});
