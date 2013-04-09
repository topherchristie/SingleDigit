({
	baseUrl: "app/js",
	paths:{
		text:"lib/text",
        xdate:'../../components/xdate/src/xdate',
        scoreCalculator:'lib/scoreCalculator',
        Backbone:'../../components/backbone/backbone-min',
        underscore:'../../components/underscore/underscore-min',
        handlebars:'../../components/handlebars/handlebars'
	},
	name:"main",
	out:"public/built-app.js",
    include:['underscore','Backbone']
})
