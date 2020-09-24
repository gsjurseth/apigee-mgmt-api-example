const express = require('express'),
      fetch   = require('node-fetch'),
      winston = require('winston');

const app     = express();
const port    = process.env.PORT || 3000;
const DEBUG   = process.env.DEBUG || 'info';

const logger = winston.createLogger({
  level: DEBUG,
  format: winston.format.json(),
  defaultMeta: { service: 'mgmt-api-proxy' },
  format: winston.format.combine(
    winston.format.splat(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console()
  ],
});

const APIM_BASE_URL = "https://api.enterprise.apigee.com/v1/o/"
let APIM_URL        = "";
let TOKEN           = "";

function listApps() {
  logger.info('fetching list of apps');
  let url = `${APIM_URL}/apps`;
  let request = {
    method: 'GET',
    headers: {
      Authorization: TOKEN,
      Accept: "application/json"
    }
  };

  logger.debug('Sending request to url: %s with request object: %j', url, request);

  return fetch( url, request )
    .then( x => x.json() );
}

function fetchApp( appId ) {
  logger.info('fetching app: %s', appId);
  let url = `${APIM_URL}/apps/${appId}`;
  let request = {
    method: 'GET',
    headers: {
      Authorization: TOKEN,
      Accept: "application/json"
    }
  };

  logger.debug('Sending request to url: %s with request object: %j', url, request);
  return fetch( url, request )
    .then( x => x.json() );
}

app.use( (req,res) => {
  logger.info('setting up APIM_URL');
  logger.debug('Request headers: %j', req.headers);
  if (req.headers['x-apigee-org']) {
    APIM_URL = `${APIM_BASE_URL}/${req.headers['x-apigee-org']}`;
    logger.debug('This is the APIM_URL: %s', APIM_URL);
  }
  else {
    throw new Error('Apigee Organization not sent in header');
  }

  if (req.headers['authorization']) {
    TOKEN = req.headers.authorization;
    logger.debug('This is the token: %s', TOKEN);
  }
  else {
    throw new Error('Must supply an authorization header with a bearer token');
  }
});

// Error handler
app.use(function (err, req, res, next) {
  logger.error( "We failed with error: %s", err );
  res.status(500).json({ "error": err, "code": 500 })
});

app.get('/apps', (req, res) => {
  listApps
    .all(fetchApp)
    .then( apps => {
      res.json( apps );
    })
});

app.listen(port, () => {
  console.log("And we're starting up");
  console.log(`Example app listening at http://localhost:${port}`);
});
