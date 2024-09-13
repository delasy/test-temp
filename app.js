const bodyParser = require('body-parser');
const express = require('express');
const fs = require('fs/promises');

const app = express();
const port = process.env.PORT ?? '8080';

app.set('trust proxy', 1);
app.use(bodyParser.json());

app.use(async (req, res, next) => {
  let data = `${new Date().toISOString()}\n`;
  data += `${req.method} ${req.originalUrl}\n`;

  for (const headerName of Object.keys(req.headers).sort()) {
    data += `${headerName}: ${req.headers[headerName]}\n`;
  }

  data += `\n${JSON.stringify(req.body)}\n`;

  await fs.appendFile('./dump.log', data, 'utf8');
  next();
});

const auth = {};
const store = {};

function id(len) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charsLen = chars.length;
  let result = '';

  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * charsLen));
  }

  return result;
}

function omit(obj, key) {
  const { [key]: omitted, ...rest } = obj;
  return rest;
}

function authorize(req, res, next) {
  const authToken = (req.get('authorization') ?? '').replace('Bearer ', '')

  if (store[authToken] === undefined) {
    res.status(401).json({
      'error_code': 'Unauthorized',
      'error_message': 'Session not found',
    });

    return;
  }

  res.locals.authToken = authToken;
  next();
}

// {"appToken":"04ebd6de-69b7-43d1-9c4b-04a6ca3305af","clientId":"7C1922ADD2502D87","clientOrigin":"android","clientVersion":"1.113.113"}
app.post('/promo/1/login-client', (req, res) => {
  const { appToken, clientId, clientOrigin } = req.body;
  const authData = JSON.stringify(req.body);

  if (auth[authData] === undefined) {
    auth[authData] = `${appToken}:${clientOrigin}:${clientId}:${id(11)}:${Date.now()}`;
    store[auth[authData]] = {
      promoCode: null,
      hasCode: false,
      eventsCount: 0,
      eventsTotal: 100,
      promoCodesCount: 0,
      promoCodesTotal: 4,
    };
  }

  res.json({ clientToken: auth[authData] });
});

// {"promoId":"04ebd6de-69b7-43d1-9c4b-04a6ca3305af"}
app.post('/promo/1/get-client', authorize, (req, res) => {
  res.json(omit(store[res.locals.authToken], 'promoCode'));
});

// {"eventId":"3773958","eventOrigin":"undefined","promoId":"04ebd6de-69b7-43d1-9c4b-04a6ca3305af"}
app.post('/promo/1/register-event', authorize, (req, res) => {
  if (store[res.locals.authToken].eventsCount !== 100) {
    store[res.locals.authToken].eventsCount += 10;
  }

  if (store[res.locals.authToken].eventsCount === 100 && !store[res.locals.authToken].hasCode) {
    store[res.locals.authToken].promoCode = `STONE-DEL-ASY-1234-5678`.toUpperCase();
    store[res.locals.authToken].hasCode = true;
    store[res.locals.authToken].promoCodesCount += 1;
  }

  res.json(omit(store[res.locals.authToken], 'promoCode'));
});

// {"promoId":"04ebd6de-69b7-43d1-9c4b-04a6ca3305af"}
app.post('/promo/1/create-code', authorize, (req, res) => {
  res.json(omit(store[res.locals.authToken], 'hasCode'));
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
