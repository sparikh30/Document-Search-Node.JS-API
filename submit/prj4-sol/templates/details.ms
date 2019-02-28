<!DOCTYPE html>
<html>
  <head>
    <title>Document Collection Search</title>
    <link rel="stylesheet" href="{{{base}}}/css/style.css">
  </head>
  <body>
    <h1>Documents Collection Search</h1>
    <ul>
      {{#errors}}
        <li class="error">{{.}}</li>
      {{/errors}}
    </ul>
    <form method="GET" action="{{{base}}}/search.html">
      <p>
        Please fill in one or more search terms in the field below:
      </p>
     
      <label>
        <span class="label">Search Terms:</span>
          <input id="query" name="q" value="{{{q}}}">
       </label>
	<br>
   
       {{#errorMessage}}
	      <span class="error">{{errorMessage}}</span><br/>
       {{/errorMessage}}	
	

      <input id="submit" name="submit" type="submit" value="search" class="control">
    </form>

    <h2>Search Results</h2>

    {{#results}}
	<p class="result">
	  <a class="doc-name" href="{{{href}}}">{{name}}</a>
	<br>
	{{#lines}}
		{{#.}}
        		{{{.}}}<br>	
		{{/.}}
	{{/lines}}
        
	</p>
    {{/results}}
    {{#links}}
	<a id="{{rel}}" href="{{{href}}}">{{rel}}</a>
    {{/links}}
    {{>footer}}
  </body>
</html>
