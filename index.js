require('dotenv').config()

const express = require('express')
const app = express()
const port = 8080
const sqlite3 = require('sqlite3').verbose()
const db = new sqlite3.Database('./db.sqlite')
const axios = require('axios')
const STREAMLABS_API_BASE = 'https://www.streamlabs.com/api/v1.0'

app.get('/', (req, res) => {
  db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS `streamlabs_auth` (`id` INTEGER PRIMARY KEY AUTOINCREMENT, `access_token` CHAR(50), `refresh_token` CHAR(50))")

    db.get("SELECT * FROM `streamlabs_auth`", (err, row) => {
      if (row) {
        axios.get(`${STREAMLABS_API_BASE}/donations?access_token=${row.access_token}`).then((response) => {
          res.send(`<pre>${JSON.stringify(response.data.data, undefined, 4)}</pre>`)
        })
      } else {
        let authorize_url = `${STREAMLABS_API_BASE}/authorize?`

        let params = {
          'client_id': process.env.CLIENT_ID,
          'redirect_uri': process.env.REDIRECT_URI,
          'response_type': 'code',
          'scope': 'donations.read+donations.create',
        }

        // not encoding params
        authorize_url += Object.keys(params).map(k => `${k}=${params[k]}`).join('&')

        res.send(`<a href="${authorize_url}">Authorize with Streamlabs!</a>`)
      }
    })
  })
})

app.get('/auth', (req, res) => {
  let code = req.query.code

  axios.post(`${STREAMLABS_API_BASE}/token?`, {
    'grant_type': 'authorization_code',
    'client_id': process.env.CLIENT_ID,
    'client_secret': process.env.CLIENT_SECRET,
    'redirect_uri': process.env.REDIRECT_URI,
    'code': code
  }).then((response) => {
    db.run("INSERT INTO `streamlabs_auth` (access_token, refresh_token) VALUES (?,?)", [response.data.access_token, response.data.refresh_token], () => {
      res.redirect('/')
    })
  }).catch((error) => {
    console.log(error)
  })
})

app.listen(port, () => console.log(`Demo app listening on port ${port}!`))
