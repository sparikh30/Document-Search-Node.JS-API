const {inspect} = require('util'); //for debugging

'use strict';

class DocFinder {
  

  /** Constructor for instance of DocFinder. */
  constructor() {
    //@TODO
    this.NoiseWords = new Set();
    this.filesContent = new Map();
    this.AllWords = new Map();
  }


  /** Return array of non-noise normalized words from string content.
   *  Non-noise means it is not a word in the noiseWords which have
   *  been added to this object.  Normalized means that words are
   *  lower-cased, have been only characters
   *  matching regex [^a-z] have been removed.
   */
  words(content) 
  {
    //console.log( content.split(/\s+/).map((w) => normalize(w)).filter((w) => !this.NoiseWords.has(w)) );
    var _this=this;
    
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



  /** Add all normalized words in noiseWords string to this as
   *  noise words. 
   */
  addNoiseWords(noiseWords) {
    //@TODO    			
        let nw= this.NoiseWords;	
	let arr = this.words(noiseWords).map(x=>x[0]);
	arr.forEach(function(x){
		nw.add(x);
	});
  }

  /** Add document named by string name with specified content to this
   *  instance. Update index in this with all non-noise normalized
   *  words in content string.
   */ 
  addContent(name, content) {
        //@TODO	   
	this.filesContent.set(name,content);
	var wordsdata = this.words(content);
	var _this=this;
	
	wordsdata.forEach(function(x){  
		if(_this.AllWords.has(x[0]))
		{
			let updateInfo = new Map();
			updateInfo = _this.AllWords.get(x[0]);
			updateInfo.set(name,x[1]);
			_this.AllWords.set(x[0],updateInfo);
		}
		else
		{
			let temp = x[1];
			let docInfo = new Map();
			docInfo.set(name,temp);
			_this.AllWords.set(x[0],docInfo);
		}
	});
  }
			
  /** Given a list of normalized, non-noise words search terms, 
   *  return a list of Result's  which specify the matching documents.  
   *  Each Result object contains the following properties:
   *     name:  the name of the document.
   *     score: the total number of occurrences of the search terms in the
   *            document.
   *     lines: A string consisting the lines containing the earliest
   *            occurrence of the search terms within the document.  Note
   *            that if a line contains multiple search terms, then it will
   *            occur only once in lines.
   *  The Result's list must be sorted in non-ascending order by score.
   *  Results which have the same score are sorted by the document name
   *  in lexicographical ascending order.
   *
   */
  find(terms) {
    //@TODO
	let mapResult = new Map();
 	const _this=this;	
	let resultArray=[];  
	terms.forEach(function(x){
		let docs = new Map();
		docs=_this.AllWords.get(x[0]);
	
		if(docs!==undefined)		
		for(let [docName,info] of docs.entries()){

			let score = info[1];	//count
			let offset = info[0];
			let tempoffset;
			let match;
			const MYWORD_REGEX = /\n/g;
			let line;
			let lineSet = new Set();
			let lineMap = new Map();

			let content = _this.filesContent.get(docName);
			while ((match = MYWORD_REGEX.exec(content)) !== null)
			{                       
                	        let offset1=MYWORD_REGEX.lastIndex;
                	        if(offset1>offset){
                	            line = content.slice(tempoffset,offset1-1);
				    break;
				}
                	        else
                		    tempoffset = offset1;                       
			}
			
			if(!mapResult.has(docName))
			{
//				lineSet.add(line);
				lineMap.set(tempoffset,line);
				mapResult.set(docName,[score,lineMap]);
			}
			else
			{
				let x = mapResult.get(docName);
				let rcount = x[0];
//				let rlineset = x[1];
				let rlineMap= x[1];
//				lineSet = rlineset.add(line);
				lineMap = rlineMap.set(tempoffset,line);
				mapResult.set(docName,[rcount+score,lineMap]);
			}
		}
	});

	
	for(let [rKey,rVal] of mapResult.entries()){
		let offsetArray = Array.from(rVal[1].keys()).sort((a,b)=> a==b? 0 : a>b?1:-1);
		let str='';
//		for(let i of rVal[1]) str=str+i+'\n';
		
		offsetArray.forEach((x)=>{
			str = str + rVal[1].get(x)+'\n';
		});	

		resultArray.push(new Result(rKey,rVal[0],str));
	}
	resultArray.sort(compareResults);

	return resultArray;
  }

  /** Given a text string, return a ordered list of all completions of
   *  the last word in text.  Returns [] if the last char in text is
   *  not alphabetic.
   */
  complete(text) {
    //@TODO
	let suggestionlist = new Array();
	let lastchar = text.substr(text.length-1);
	let reg1 = new RegExp(/^[a-zA-Z]/);
        if(!reg1.test(lastchar)){
                return [''];
        }  
	else{
	let comp =  text.split(/\s+/).map((w) => normalize(w));  //            this.words(text).map(x => x[0]);
	comp=Array.from(new Set(comp));

	let lastWord = comp[comp.length-1];   
	var suggestion='';
	var cnt=0;
	
	const myindex = Array.from(this.AllWords.keys());

	let wregex = new RegExp('^' + lastWord);

	myindex.forEach(function(x){
		
		if(wregex.test(x)){
			suggestionlist.push(x);
		}
	}
	);
	if(suggestionlist.length!==0){
		suggestionlist.sort();
		return suggestionlist;
	}
	else
	{
		return [''];
	}
	}
  }

  
} //class DocFinder

module.exports = DocFinder;

/** Regex used for extracting words as maximal non-space sequences. */
const WORD_REGEX = /\S+/g;

/** A simple class which packages together the result for a 
 *  document search as documented above in DocFinder.find().
 */ 
class Result {
  constructor(name, score, lines) {
    this.name = name; this.score = score; this.lines = lines;
  }

  toString() { return `${this.name}: ${this.score}\n${this.lines}\n\n\n`; }
}

/** Compare result1 with result2: higher scores compare lower; if
 *  scores are equal, then lexicographically earlier names compare
 *  lower.
 */
function compareResults(result1, result2) {
  return (result2.score - result1.score) || result1.name.localeCompare(result2.name);
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

