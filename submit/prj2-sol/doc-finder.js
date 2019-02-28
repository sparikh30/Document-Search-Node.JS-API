const assert = require('assert');
const mongo = require('mongodb').MongoClient;

const {inspect} = require('util'); //for debugging

'use strict';

/** This class is expected to persist its state.  Hence when the
 *  class is created with a specific database url, it is expected
 *  to retain the state it had when it was last used with that URL.
 */ 
class DocFinder {

  /** Constructor for instance of DocFinder. The dbUrl is
   *  expected to be of the form mongodb://SERVER:PORT/DB
   *  where SERVER/PORT specifies the server and port on
   *  which the mongo database server is running and DB is
   *  name of the database within that database server which
   *  hosts the persistent content provided by this class.
   */
  constructor(dbUrl) {

	this.mongoUrl = dbUrl.substring(0,dbUrl.lastIndexOf('/'));
	this.client=null;
	this.dbname= dbUrl.substring(dbUrl.lastIndexOf('/')+1 , dbUrl.length);  
	this.db=null; 
	this.NoiseWords = new Set();
	this.DocSet= new Set();  
  }

  /** This routine is used for all asynchronous initialization
   *  for instance of DocFinder.  It must be called by a client
   *  immediately after creating a new instance of this.
   */
  async init() {
    //TODO
	  this.client = await mongo.connect(this.mongoUrl,{useNewUrlParser: true});
	  this.db=this.client.db(this.dbname);
   }

  /** Release all resources held by this doc-finder.  Specifically,
   *  close any database connections.
   */
  async close() {
	await this.client.close();
  }

  /** Clear database */
  async clear() {
    //TODO
	await this.db.dropDatabase(); 
  }

  /** Return an array of non-noise normalized words from string
   *  contentText.  Non-noise means it is not a word in the noiseWords
   *  which have been added to this object.  Normalized means that
   *  words are lower-cased, have been stemmed and all non-alphabetic
   *  characters matching regex [^a-z] have been removed.
   */
  async words(content) {
    //TODO
  
     var _this=this;
    
     var nw =  await this.db.collection('NoiseWords').find({_id :'NoiseWord'},{_id:0}).toArray();
     
    if(nw.length!=0)  
     this.NoiseWords = new Set(nw[0].val); 
    	  
    function _wordsLow (content)
    {
        var wordSet=[];
        var i=0;
        var wordMap = new Map();

                var count=0;
                let array1;
                let offset;

                while ((array1 = WORD_REGEX.exec(content)) !== null)
                {
                       var NormWord = normalize(array1[0]);
                       if(!_this.NoiseWords.has(NormWord))
                       {
		 	      
                       if(wordMap.has(NormWord))
                       {
                                var temp= wordMap.get(NormWord);
                                let p =++temp[1];
                                let q =temp[0];
                                wordMap.set(NormWord,[q,p]);
                       }
                       else
                       {
                          let offset=WORD_REGEX.lastIndex - array1[0].length;
                          wordMap.set(NormWord,[offset,1]);
                       }
                       }
                }

        wordSet = Array.from(wordMap);
        return wordSet;
    }

    return _wordsLow(content);
  }

  /** Add all normalized words in the noiseText string to this as
   *  noise words.  This operation should be idempotent.
   */
  async addNoiseWords(noiseText) {
    //TODO
	let x =await this.words(noiseText);
	x=x.map(x=>x[0]);  
	const dbTable0= this.db.collection('NoiseWords');
	
	if(x.length!=0)
        {  
		try 
		{
			await dbTable0.insertOne({ _id :'NoiseWord',val: x });
                } catch (e) {
	         	console.log(e);
                }
	}
        else{
          console.log("ALready exist.");
        }
  }

  /** Add document named by string name with specified content string
   *  contentText to this instance. Update index in this with all
   *  non-noise normalized words in contentText string.
   *  This operation should be idempotent.
   */ 
  async addContent(name, contentText) {
    //TODO
	 
	const dbTable2 = this.db.collection('AllContent');
	let allwords=[];
	let wordmap = new Map();
	 
	if(this.DocSet.has(name)){ 
		console.log("Document already exist in Database");
		return;
	}else{
		this.DocSet.add(name);
	}
	  
	try {
          await dbTable2.insertOne({_id:name,content:contentText});
	  allwords =  await this.db.collection('AllWords').find({}).toArray();	  	
        } catch (e) {
       	    console.log(e+"------------------here0-");
       	}
	for(const aa of allwords ){
		wordmap.set(aa._id,aa.documents);
	}

	  
	var wordsdata = await this.words(contentText);

	let ab=[];  

	for(let worddata of wordsdata){		// word[0] is name, word[1] is [offset,count]

		if(!wordmap.has(worddata[0]))
		{
			ab.push({'_id':worddata[0],'documents': [ { 'doc_name':name,'offset':worddata[1][0],'count':worddata[1][1] } ] });
		}
		else
		{
			let tempInfo = wordmap.get(worddata[0]);  	//returns array	
			tempInfo.push( { 'doc_name':name,'offset':worddata[1][0],'count':worddata[1][1] } );
			try{
				await this.db.collection('AllWords').updateOne({'_id':worddata[0]},{ $set : {'documents':tempInfo } } );
			}
			catch(e){
				console.log(e);
			}			
		}
	}

	const dbTable3 = this.db.collection('AllWords');
	
	if(ab.length!=0){  
	try {
          await dbTable3.insertMany(ab);
        } catch (e) {
           console.log(e);
        } 
	}	  
  }


  /** Return contents of document name.  If not found, throw an Error
   *  object with property code set to 'NOT_FOUND' and property
   *  message set to `doc ${name} not found`.
   */
  async docContent(name) {
    //TODO
     let containString=null;
     let a='';	  
     try {
          containString =  await this.db.collection('AllContent').find({'_id':name}).toArray();
        }
     catch(e) {
            console.log(e);
        }
	if(containString.length!==0)  
	return containString[0].content;
	else 
	return `doc ${name} not found\n`;
  }
  
  /** Given a list of normalized, non-noise words search terms, 
   *  return a list of Result's  which specify the matching documents.  
   *  Each Result object contains the following properties:
   *
   *     name:  the name of the document.
   *     score: the total number of occurrences of the search terms in the
   *            document.
   *     lines: A string consisting the lines containing the earliest
   *            occurrence of the search terms within the document.  The 
   *            lines must have the same relative order as in the source
   *            document.  Note that if a line contains multiple search 
   *            terms, then it will occur only once in lines.
   *
   *  The returned Result list must be sorted in non-ascending order
   *  by score.  Results which have the same score are sorted by the
   *  document name in lexicographical ascending order.
   *
   */
  async find(terms) {
    //TODO
	terms=terms.map(x=>x[0]);
	let DocIndex=[];
	let resultArray=[];
	let mapResult = new Map();

	for(let term of terms){
		 try {
		          DocIndex =  await this.db.collection('AllWords').find({_id:term},{"_id":0}).toArray();
	          } catch (e) {
	           	  console.log(e);
	          }

		  if(DocIndex.length!==0){
			let docs= DocIndex[0].documents;	
			  
			for(let doc of docs){
						
			let score = doc.count;    //count
                        let offset = doc.offset; 
                        let tempoffset;
                        let match;
                        const MYWORD_REGEX = /\n/g;
                        let line;
                        let lineSet = new Set();
                        let lineMap = new Map();
		
			let content = await this.docContent(doc.doc_name);
			while ((match = MYWORD_REGEX.exec(content)) !== null)
                        {
                                let offset1=MYWORD_REGEX.lastIndex;
                                if(offset1>offset){
                                    line = content.slice(tempoffset,offset1-1);
                                    break;
                                }
                                else
				{    tempoffset = offset1;}

	
                        }
	
			if(!mapResult.has(doc.doc_name))
                        {
				let q = doc.doc_name;
                                lineMap.set(tempoffset,line);
                                mapResult.set(q,[score,lineMap]);
                        }
                        else
                        {
				let w= doc.doc_name;
                                let x = mapResult.get(w);
                                let rcount = x[0];
                                let rlineMap= x[1];
                                lineMap = rlineMap.set(tempoffset,line);
                                mapResult.set(w,[rcount+score,lineMap]);
                        }
	
			}	// inner for loop : docs to doc

		  }		// if 
	}// outer for

   	for(let [rKey,rVal] of mapResult.entries()){
                let offsetArray = Array.from(rVal[1].keys()).sort((a,b)=> a==b? 0 : a>b?1:-1);
                let str='';

                offsetArray.forEach((x)=>{
                        str = str + rVal[1].get(x)+'\n';
                });

                resultArray.push(new Result(rKey,rVal[0],str));
        }
        resultArray.sort(compareResults);
	  
        return resultArray;

  }

  /** Given a text string, return a ordered list of all completions of
   *  the last normalized word in text.  Returns [] if the last char
   *  in text is not alphabetic.
   */
  async complete(text) {
    //TODO
        let suggestionlist = new Array();
        let lastchar = text.substr(text.length-1);
        let reg1 = new RegExp(/^[a-zA-Z]/);
        if(!reg1.test(lastchar)){
                return [''];
        } 


	let comp =  text.split(/\s+/).map((w) => normalize(w));  //            this.words(text).map(x => x[0]);
        let lastWord = comp[comp.length-1];
	let myindex=[];
	try {
                  myindex =  await this.db.collection('AllWords').find({_id : {$regex :`^${lastWord}`}},{documents:0}).toArray();
        } catch (e) {
                  console.log(e);
        }
	myindex= myindex.map(x=>x._id);
		
        if(myindex.length!==0){
                myindex.sort();
                return myindex;
        }
        else
        {
                return [''];
        }
  }

  //Add private methods as necessary

} //class DocFinder

module.exports = DocFinder;


const MONGO_URL = 'mongodb://localhost:27017';
const DB_NAME = 'users';
const USERS_TABLE = 'userInfos';

//Add module global functions, constants classes as necessary
//(inaccessible to the rest of the program).

//Used to prevent warning messages from mongodb.
const MONGO_OPTIONS = {
  useNewUrlParser: true
};

/** Regex used for extracting words as maximal non-space sequences. */
const WORD_REGEX = /\S+/g;

/** A simple utility class which packages together the result for a
 *  document search as documented above in DocFinder.fin/().
 */ 
class Result {
  constructor(name, score, lines) {
    this.name = name; this.score = score; this.lines = lines;
  }

  toString() { return `${this.name}: ${this.score}\n${this.lines}`; }
}

/** Compare result1 with result2: higher scores compare lower; if
 *  scores are equal, then lexicographically earlier names compare
 *  lower.
 */
function compareResults(result1, result2) {
  return (result2.score - result1.score) ||
    result1.name.localeCompare(result2.name);
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



