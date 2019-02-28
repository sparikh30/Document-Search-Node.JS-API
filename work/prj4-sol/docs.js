'use strict';

const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const fs = require('fs');
const mustache = require('mustache');
const Path = require('path');
const querystring = require('querystring');

const { URL } = require('url');

const STATIC_DIR = 'statics';
const TEMPLATES_DIR = 'templates';

function serve(port, base, model) {
  const app = express();
  app.locals.port = port;
  app.locals.base = base;
  app.locals.model = model;
  process.chdir(__dirname);
  app.use(base, express.static(STATIC_DIR));
  setupTemplates(app, TEMPLATES_DIR);
  setupRoutes(app);
  app.listen(port, function() {
    console.log(`listening on port ${port}`);
  });
}


module.exports = serve;

const FIELDS_INFO = {
q: {
    friendlyName: 'Search Term',
    isSearch: 'true',
    isId: 'true',
    isRequired: 'true',
    regex: /./,
    error: 'No NewLine Character',
  }
};
const FIELDS =  Object.keys(FIELDS_INFO).map((n) => Object.assign({name: n}, FIELDS_INFO[n]));
//const upload =  multer({ storage: storage }).single('file');
/******************************** Routes *******************************/

function setupRoutes(app) {
  //@TODO add appropriate routes
  const base = app.locals.base;

  app.get(`/`,doRedirect(app));	
  app.get(`${base}`,displayHome(app));
  app.get(`${base}/index.html`, displayHome(app));

  app.get(`${base}/search.html`,doSearch(app));

  app.post(`${base}/add`,multer({ storage: storage }).single('file'), doAddDoc(app)); 

  app.get(`${base}/add.html`,addDocForm(app));
  app.get(`${base}/:docName`, getContent(app));
	
}

/*************************** Action Routines ***************************/

//@TODO add action routines for routes + any auxiliary functions.


function addDocForm(app){
	return async function(req,res){
                let template = "addDoc";
		let model = {base : app.locals.base};
		const html = doMustache(app, template, model);
                res.send(html);
        }
}

var storage = multer.diskStorage({
	destination: function(req, file, callback) {
		callback(null, './statics')
	},
	filename: function(req, file, callback) {
		callback(null, Path.basename(file.originalname,Path.extname(file.originalname) ))
	}
})

function doAddDoc(app){
	return async function(req,res){

		let errors= undefined;

		console.log(req.body, 'Body');
 		console.log(req.file ,  'files');
		
		if(req.file == undefined){
                       const msg = 'please select a file containing a document to upload';
                       errors = Object.assign(errors || {}, { _: msg });
		}

		if(!errors)
		{
		var contents = fs.readFileSync(req.file.path,'utf8');
		var name = req.file.filename;
	 	

		let result = await app.locals.model.addDoc({name: req.file.filename,content:contents});
//		console.log(result);

		fs.unlinkSync(req.file.path);

		res.redirect(`${app.locals.base}/${name}`);
		}
		else
		{
			let template="addDoc";
			let model = {base : app.locals.base,errors:errors._};
	                const html = doMustache(app, template, model);
        	        res.send(html);
		}
	}
}


function doSearch(app){
	return async function(req,res){
		const isSubmit = req.query.submit !== undefined;
		let docs = {};
		let errors = undefined;
		const search = getNonEmptyValues(req.query);
					
		if (isSubmit || req.query.q) {
//			errors = validate(search);
			if (Object.keys(search).length == 1 && Object.keys(search)[0] =='submit') {
				const msg = 'please specify one-or-more search terms';
				errors = Object.assign(errors || {}, { _: msg });
			}
			if (!errors) 
			{			
				const q = querystring.stringify(search);
//				console.log(q);
				try {
				  docs = await app.locals.model.search(q);	
				  //console.log(docs);	
				}
				catch (err) {
//			          console.error(err);
				  errors = wsErrors(err);
				}
				if (docs.totalCount == 0 ) {
					 errors = {_: `no documents containing ${req.query.q} found; please retry`};
				}
			}
    		}

		let model, template;
		if (docs.totalCount > 0) {
			template = 'details';
		//	const fields =	docs.map((u) => ({resu:u.name,href:u.href,lines:u.lines,count:u.score}));
			let tempResult = docs.results.map(function(u) {
				let x = {
					name : u.name,
					score : u.score,
					lines : u.lines.map(x => coloredLine(x,req.query.q)),
					href : `${app.locals.base}/${u.name}`
				};
				return x;
			});
			let tempLinks = docs.links.filter( x => x.rel!='self');
			tempLinks = tempLinks.map(function(ele){
				let z ={
					rel : ele.rel,
					href : `${app.locals.base}/search.html?q=${req.query.q}&start=${ele.start}`
				};
				return z;
			});

			model = { base: app.locals.base, results: tempResult, count: docs.totalCount, links: tempLinks, q : req.query.q };
		}
		else {
		      template =  'search';
		      model = errorModel(app, search, errors);
		}
		const html = doMustache(app, template, model);
		res.send(html);
	}
}

String.prototype.splice = function(idx, rem, str) {
    return this.slice(0, idx) + str + this.slice(idx + Math.abs(rem));
};

function coloredLine(line,q){
    let z = q.trim().split(/\s+/);
    let x=line;
    z.forEach( function(ele){
    
	    let normEle = normalize(ele);
	    
	    if(!normEle==""){

	    let regexstring = normEle;
	    let regexp = new RegExp(`\\b${regexstring}\\b`, "gi"); 
	    let res = x.match(regexp);
	    console.log("result for line match : "+res);    
	    //x = x.replace(regexp,`<span class="search-term">${normEle}</span>`); 
	    if(res!=undefined){
	    res.forEach(function(tempp){
		let regex2 = new RegExp(`\\b${tempp}\\b`,"g");    
		x= x.replace(regex2,`<span class="search-term">${tempp}</span>`);
	    });
	    }
	    }
    });
    return x;
}

/** Normalize word by stem'ing it, removing all non-alphabetic
 *  characters and converting to lowercase.
 */
function normalize(word) {

  return stem(word.toLowerCase()).replace(/[^a-z]/g, '');

}

/** Place-holder for stemming a word before normalization; this
 *  implementation merely removes 's suffixes.
 */
function stem(word) {
  return word.replace(/\'s$/, '');
}


function doRedirect(app){
	return async function(req,res){
		res.redirect(`${app.locals.base}`);
	};
}


function displayHome(app){
	return async function(req,res){
	let model = {};	
	const html = doMustache(app, 'homePage', model);
	res.send(html);
	}
}

function getContent(app){
	 return async function(req, res) {
//		console.log("requested"); 
	    let model;
	    const docName = req.params.docName;
	    try {
	      const doc = await app.locals.model.getDocument(docName);
	      model = { base: app.locals.base, name : docName, content :doc.content };
	    }
	    catch (err) {
	      console.error("second");
	      const errors = wsErrors(err);	
	      model = errorModel(app, {}, errors);
	    }
	    const html = doMustache(app, 'document', model);
	    res.send(html);
  	};
}



/** Given map of field values and requires containing list of required
 *  fields, validate values.  Return errors hash or falsy if no errors.
 */
function validate(values, requires=[]) {
  const errors = {};
  requires.forEach(function (name) {
    if (values[name] === undefined) {
      errors[name] =
	`A value for '${FIELDS_INFO[name].friendlyName}' must be provided`;
    }
  });
  for (const name of Object.keys(values)) {
    const fieldInfo = FIELDS_INFO[name];
    const value = values[name];
    if (fieldInfo.regex && !value.match(fieldInfo.regex)) {
      errors[name] = fieldInfo.error;
    }
  }
  return Object.keys(errors).length > 0 && errors;
}


/************************ General Utilities ****************************/

/** Return copy of FIELDS with values and errors injected into it. */
function fieldsWithValues(values, errors={}) {
  return FIELDS.map(function (info) {
    const name = info.name;
    const extraInfo = { value: values[name] };
    if (errors[name]) extraInfo.errorMessage = errors[name];
    return Object.assign(extraInfo, info);
  });
}

/** Decode an error thrown by web services into an errors hash
 *  with a _ key.
 */
function wsErrors(err) {
  const msg = (err.message) ? err.message : 'web service error';
  console.error(msg);
  return { _: [ msg ] };
}

/** Return a model suitable for mixing into a template */
function errorModel(app, values={}, errors={}) {
  return {
    base: app.locals.base,
    errors: errors._,
    fields: fieldsWithValues(values, errors)
  };
}

/** return object containing all non-empty values from object values */
function getNonEmptyValues(values) {
  const out = {};
  Object.keys(values).forEach(function(k) {
    const v = values[k];
    if (v && v.trim().length > 0) out[k] = v.trim();
  });
  return out;
}


/** Return a URL relative to req.originalUrl.  Returned URL path
 *  determined by path (which is absolute if starting with /). For
 *  example, specifying path as ../search.html will return a URL which
 *  is a sibling of the current document.  Object queryParams are
 *  encoded into the result's query-string and hash is set up as a
 *  fragment identifier for the result.
 */
function relativeUrl(req, path='', queryParams={}, hash='') {
  const url = new URL('http://dummy.com');
  url.protocol = req.protocol;
  url.hostname = req.hostname;
  url.port = req.socket.address().port;
  url.pathname = req.originalUrl.replace(/(\?.*)?$/, '');
  if (path.startsWith('/')) {
    url.pathname = path;
  }
  else if (path) {
    url.pathname += `/${path}`;
  }
  url.search = '';
  Object.entries(queryParams).forEach(([k, v]) => {
    url.searchParams.set(k, v);
  });
  url.hash = hash;
  return url.toString();
}

/************************** Template Utilities *************************/


/** Return result of mixing view-model view into template templateId
 *  in app templates.
 */
function doMustache(app, templateId, view) {
  const templates = { footer: app.templates.footer };
  return mustache.render(app.templates[templateId], view, templates);
}

/** Add contents all dir/*.ms files to app templates with each 
 *  template being keyed by the basename (sans extensions) of
 *  its file basename.
 */
function setupTemplates(app, dir) {
  app.templates = {};
  for (let fname of fs.readdirSync(dir)) {
    const m = fname.match(/^([\w\-]+)\.ms$/);
    if (!m) continue;
    try {
      app.templates[m[1]] =
	String(fs.readFileSync(`${TEMPLATES_DIR}/${fname}`));
    }
    catch (e) {
      console.error(`cannot read ${fname}: ${e}`);
      process.exit(1);
    }
  }
}

