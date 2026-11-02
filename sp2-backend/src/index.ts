// The entry point: create the app, mount the routes, listen.
//
//     npm run build
//     npm start
//
// Then send requests with requests.http, or with a browser for the GETs.

import { app } from './app.js';

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});