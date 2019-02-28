'use strict';

const axios = require('axios');


function DocsWs(baseUrl) {
  this.docsUrl = `${baseUrl}/docs`;
}

module.exports = DocsWs;

DocsWs.prototype.addDoc = async function(docObj){
  try {
    const response = await axios.post(`${this.docsUrl}`,docObj);
    return response.data;
  }
  catch (err) {
    console.error("first");
    throw (err.response && err.response.data) ? err.response.data : err;
  }

}



DocsWs.prototype.getDocument = async function(docName){

  try {
    const response = await axios.get(`${this.docsUrl}/${docName}`); 
    return response.data;
  }
  catch (err) {
    throw (err.response && err.response.data) ? err.response.data : err;
  }  
};

DocsWs.prototype.search = async function(query){

  try {
    const response = await axios.get(`${this.docsUrl}?${query}`);
    return response.data;
  }
  catch (err) {
    throw (err.response && err.response.data) ? err.response.data : err;
  }
};


//@TODO add wrappers to call remote web services.
  
