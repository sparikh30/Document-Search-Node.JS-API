<head>
    <title>{{name}}</title>
    <link rel="stylesheet" href="/docs/css/style.css">
</head>
<body>
    <h1 class="doc-name">{{name}}</h1>
    <ul>
      {{#errors}}
        <li class="error">{{.}}</li>
      {{/errors}}
    </ul>
    <pre class="content">{{content}}</pre>
{{>footer}}
</body>
