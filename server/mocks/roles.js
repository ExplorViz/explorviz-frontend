/* eslint-env node */
'use strict';

module.exports = function (app) {
  const express = require('express');
  let roleRouter = express.Router();

  const roles = {
    "data": [
      {
        "type": "role",
        "id": "admin",
        "attributes": {
          
        }
      },
      {
        "type": "role",
        "id": "user",
        "attributes": {

        }
      }
    ]
  };

  roleRouter.get('/', function (req, res) {
    res.send(roles);
  });

  roleRouter.get('/:id', function (req, res) {
    const roleCount = roles.data.length;
    for (let i = 0; i < roleCount; i++) {
      if(roles.data[i].id == req.params.id) {
        res.send({
          "data": roles.data[i]
        });
        return;
      }
    }
  });

  // The POST and PUT call will not contain a request body
  // because the body-parser is not included by default.
  // To use req.body, run:

  //    npm install --save-dev body-parser

  // After installing, you need to `use` the body-parser for
  // this mock uncommenting the following line:
  //
  //app.use('/api/v1/roles', require('body-parser').json({ type: 'application/vnd.api+json' }));
  app.use('/api/v1/roles', roleRouter);
};
