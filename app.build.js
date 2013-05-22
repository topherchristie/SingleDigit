({
	baseUrl: "app/js",
	paths:{
		text:"lib/text",
        xdate:'../../components/xdate/src/xdate',
        scoreCalculator:'lib/scoreCalculator',
        Backbone:'../../components/backbone/backbone-min',
        underscore:'../../components/underscore/underscore-min',
        handlebars:'../../components/handlebars/handlebars',
        d3:'../../components/d3/d3.min'
	},
	name:"main",
   /* optimize: "none",*/
	out:"public/built-app.js",
    include:['underscore','Backbone','handlebars','d3']
})
