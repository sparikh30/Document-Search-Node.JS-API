<!DOCTYPE html>
<html>
<head>
    <title>Documents Collections Search</title>
    <link rel="stylesheet" href="/docs/css/style.css">
</head>
<body>
    <h1>Documents Collection Search</h1>
    <ul>
      {{#errors}}
        <li class="error">{{.}}</li>
      {{/errors}}
    </ul>
    <form method="GET" action="/docs/search.html">
      <p>
        Please fill in one or more search terms in the field below:
      </p>
      {{#fields}}       
      <label>
        <span class="label">{{friendlyName}}:</span>
          <input id="query" name="{{name}}" {{#type}}type="{{type}}" {{/type}} value="{{value}}">
       </label>
        <br>
   
       {{#errorMessage}}
              <span class="error">{{errorMessage}}</span><br/>
       {{/errorMessage}}

      {{/fields}}

      <input id="submit" name="submit" type="submit" value="search" class="control">
    </form>

{{>footer}}

</body></html>
