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

// Core api functions
async function callMgmtAPI( urlSuffix ) {
  logger.info('fetching list of apps');
  let url = `${APIM_URL}${urlSuffix}`;
  let request = {
    method: 'GET',
    headers: {
      Authorization: TOKEN,
      Accept: "application/json"
    }
  };

  logger.info('Calling API with url: %s', url);
  logger.debug('Request', request);

  return fetch( url, request )
    .then( x => x.json() )
    .then( x => {
      logger.debug('URL %s: gave us', url, x);
      return x;
    });
}

// Special function to handle masking of app credential secret
async function fetchApp( appId ) {
  logger.info('fetching app with id: %s', appId);

  return callMgmtAPI( `/apps/${appId}` )
    .then( x => {
      logger.info('Fetched app with name: %s', x.name);
      x.credentials = x.credentials.map( c => {
        c.consumerSecret = "**********";
        return c;
      });
      return x;
    });
}

/// Express routing and stuff 
app.use( (req,res,next) => {
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
  next();
});

// Error handler
app.use((err, req, res, next) => {
  logger.error( "We failed with error: %s", err );
  res.status(500).json({ "error": err, "code": 500 })
  next();
});

app.get('/apps', async (req, res) => {
  logger.info('Entering /apps request');
  let appList = await callMgmtAPI( '/apps'  );
  Promise.all( appList.map( async app => {
    return fetchApp(app);
  }))
    .then( apps => {
      logger.debug('Apps: ', apps);
      res.json( apps.map( a => {
        let x = {};
        x[a.name] = a.appId;
        return x;
      }));
    });
});

app.get('/apps/:appName', async (req, res) => {
  logger.info('Entering /apps/:appName request');
  await fetchApp( req.params.appName )
    .then( app => {
      logger.debug('App fetched: ', app);
      res.json( app );
    });
});

app.get('*', async (req, res) => {
  logger.info('Entering catchall request');
  await callMgmtAPI( req.url )
    .then( x => {
      res.json( x );
    });
});

app.listen(port, () => {
  console.log("And we're starting up");
  console.log(`Example app listening at http://localhost:${port}`);
});
