'use strict';

const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const process = require('process');
const url = require('url');
const queryString = require('querystring');

const OK = 200;
const CREATED = 201;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const CONFLICT = 409;
const SERVER_ERROR = 500;


//Main URLs
const DOCS = '/docs';
const COMPLETIONS = '/completions';

//Default value for count parameter
const COUNT = 5;

/** Listen on port for incoming requests.  Use docFinder instance
 *  of DocFinder to access document collection methods.
 */
function serve(port, docFinder) {
  const app = express();
  app.locals.port = port;
  app.locals.finder = docFinder;
  setupRoutes(app);
  const server = app.listen(port, async function() {
    console.log(`PID ${process.pid} listening on port ${port}`);
  });
  return server;
}	

module.exports = { serve };

function setupRoutes(app) {
  app.use(cors());            //for security workaround in future projects
  app.use(bodyParser.json()); //all incoming bodies are JSON

  //@TODO: add routes for required 4 services
  app.get(DOCS,doSearchContent(app));
  app.get('/docs/:docId',doGetContent(app));
  app.get('/completions',doComplete(app));
  app.post(DOCS,doCreateDoc(app));
  app.use(doErrors()); //must be last; setup for server errors   
}


//@TODO: add handler creation functions called by route setup
//routine for each individual web service.  Note that each
//returned handler should be wrapped using errorWrap() to
//ensure that any internal errors are handled reasonably.


function doCreateDoc(app){
	return errorWrap(async function(req, res) {
		try{
			 if(req.body.name == undefined){
                                throw {
                                        isDomain: true,
                                        code: "BAD_PARAM",
                                        message: "required query parameter \"name\" is missing"
                                };
                        }
			 if(req.body.content == undefined){
                                throw {
                                        isDomain: true,
                                        code: "BAD_PARAM",
                                        message: "required query parameter \"content\" is missing"
                                };
                        }
			const docName = req.body.name;
			const docContent = req.body.content;

			const result = await app.locals.finder.addContent(docName,docContent);
			const resultObj = {
				href : baseUrl(req,`${DOCS}/${docName}`)
			};
			res.location(resultObj.href);
			res.status(CREATED).json(resultObj);
		}
		catch(err){
                        const mapped = mapError(err);
                        res.status(mapped.status).json({code:mapped.code,message:mapped.message});
		}
        });
	
}



function doSearchContent(app){

	return errorWrap(async function(req, res) {
		try{
			const regexNumber = RegExp('^[0-9]+$');
			var count=5;
			var start=0;
			if(req.query.q == undefined){
				throw {
					isDomain: true,
					code: "BAD_PARAM",
					message: "required query parameter \"q\" is missing"
				};
			}
			var paramq = req.query.q;
			if(req.query.start){
				if(!regexNumber.test(req.query.start)){
					throw {
                                        isDomain: true,
                                        code: "BAD_PARAM",
                                        message: "Bad query parameter \"start\""
        	                        };
				}
				else{
				start = Number(req.query.start);
				}
			}
			if(req.query.count){
				if(!regexNumber.test(req.query.start)){
					throw {
                                        isDomain: true,
                                        code: "BAD_PARAM",
                                        message: "Bad query parameter \"count\""
                                        };
				}
				else{
				count= Number(req.query.count);
				}
			}
			var docResults = await app.locals.finder.find(req.query.q);
			paramq = paramq.replace(/\s/g, "%20");

			const totalLength = docResults.length;

			docResults=docResults.slice(start,count+start);			
			docResults.map(function(x){
				x.href = baseUrl(req,`${DOCS}/${x.name}`);
			});

                        const link =[];
			link.push({
                                "rel" : "self",
                                "href" : baseUrl(req,`${DOCS}?q=${paramq}&start=${start}&count=${count}`)
                        });

			if(start>0 && start <5){
				link.push({
					"rel": "previous",
					"href": baseUrl(req,`${DOCS}?q=${paramq}&start=0&count=5`)
				});
			}
			else if(start>=5){
				link.push({
                                        "rel": "previous",
                                        "href": baseUrl(req,`${DOCS}?q=${paramq}&start=${start-5}&count=5`)
                                });
			}

			if(start<totalLength-5){
				 link.push({
                                        "rel": "next",
                                        "href": baseUrl(req,`${DOCS}?q=${paramq}&start=${start+5}&count=5`)
                                });
			}

			var resultObj = {
				results : docResults,
				totalCount : totalLength,
				links : link
			}
			res.json(resultObj);
		}
		catch(err){
			const mapped = mapError(err);
                        res.status(mapped.status).json({code:mapped.code,message:mapped.message});
		}
        });
}


function doComplete(app){
	 return errorWrap(async function(req, res) {
                try {
			if(req.query.text==undefined){
				throw {
                                        isDomain : true,
                                        code : 'BAD_PARAM',
					message: "required query parameter \"text\" is missing",
                                };
			}
			else{
	                        const text = req.query.text || '';
	                        const results = await app.locals.finder.complete(text);
				res.json(results);
			}
		}
                catch(err) {
                        const mapped = mapError(err);
                        res.status(mapped.status).json({code:mapped.code,message:mapped.message});
                }
        });
}

function doGetContent(app){
	return errorWrap(async function(req, res) {
		try {
			const docId = req.params.docId;
			const results = await app.locals.finder.docContent(docId);
			const returned ={
				"content": results,
				"links" : [
					{
					"rel" : "self",	
					"href" : baseUrl(req,`${DOCS}/${docId}`)
					}
				]
			}
			res.json(returned);
		}
		catch(err) {
			err.isDomain=true;
			const mapped = mapError(err);
			res.status(mapped.status).json({code:mapped.code,message:mapped.message});
		}
	});
}



/** Return error handler which ensures a server error results in nice
 *  JSON sent back to client with details logged on console.
 */ 
function doErrors(app) {
  return async function(err, req, res, next) {
    res.status(SERVER_ERROR);
    res.json({ code: 'SERVER_ERROR', message: err.message });
    console.error(err);
  };
}

/** Set up error handling for handler by wrapping it in a 
 *  try-catch with chaining to error handler on error.
 */
function errorWrap(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    }
    catch (err) {
      next(err);
    }
  };
}
  
const ERROR_MAP = {
  EXISTS: CONFLICT,
  NOT_FOUND: NOT_FOUND,
  BAD_PARAM : BAD_REQUEST
}

/** Map domain/internal errors into suitable HTTP errors.  Return'd
 *  object will have a "status" property corresponding to HTTP status
 *  code.
 */
function mapError(err) {
  return err.isDomain
    ? { status: (ERROR_MAP[err.code] || BAD_REQUEST),
	code : err.code,    
	message: err.message
      }
    : { status: SERVER_ERROR,
	code: 'INTERNAL',
	message: err.toString()
      };
}


/** Return base URL of req for path.
 *  Useful for building links; Example call: baseUrl(req, DOCS)
 */
function baseUrl(req, path='/') {
  const port = req.app.locals.port;
  const url = `${req.protocol}://${req.hostname}:${port}${path}`;
  return url;
}
