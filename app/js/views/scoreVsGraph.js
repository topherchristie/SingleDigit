define(["d3"],function(ddd){
    var ScoreVsGraphView = Backbone.View.extend({
        //template: Handlebars.compile(template),
        events:{
            
        },
        initialize:function(){
            this.model.on('change',this.render, this);
            //this.model.on('destroy',this.remove, this);
        //    this.render();
        },
        render: function(){
            var margin = {top:20,bottom:30,left:30,right:15};
            var fullWidth = 400;
            var fullHeight = 300;
            var width = fullWidth - margin.left - margin.right;
            var height = fullHeight - margin.top - margin.bottom;
            var data = this.model.toJSON().data;
              console.log(data);
              var xlist  =[];
          
            var xMax = d3.max(data,function(d){return d.x;});
            var xMin = d3.min(data,function(d){return d.x;});
            var yMax = d3.max(data,function(d){return d.y;});
            var yMin = d3.min(data,function(d){return d.y;});
            
            var x = d3.scale.linear()
                .domain([xMin-1,xMax+1])
                .range([0,width]);
            var y = d3.scale.linear()
                .domain([yMin,yMax])
                .range([height, 0]);

            var graph = d3.select(this.el).append("svg:svg")
                .attr("width", fullWidth)
                .attr("height", fullHeight)
                .attr("class",'graph')
                ;
            var main = graph.append('g')
                .attr('transform','translate(' +margin.left + ',' + margin.top + ')')
                .attr('width',width)
                .attr('height',height);
            // draw the x axis
            var xAxis = d3.svg.axis()
            .scale(x)
            .orient('bottom');
            
            main.append('g')
            .attr('transform', 'translate(0,' + height + ')')
            .attr('class', 'x axis')
            .call(xAxis);
            
            // draw the y axis
            var yAxis = d3.svg.axis().scale(y).orient('left')//.ticks(yMax-yMin+1);
            main.append('g').attr('transform', 'translate(0,0)').attr('class', 'y axis').call(yAxis);

            // draw the graph object
            var g = main.append("svg:g"); 
            g.selectAll("scatter-dots")
            .data(data)  // using the values in the ydata array
            .enter().append("svg:circle")  // create a new circle for each value
            .attr("cy", function (d) { return y(d.y); } ) // translate y value to a pixel
            .attr("cx", function (d,i) { return x(d.x); } ) // translate x value
            .attr("r", 2); // radius of circle
     // .style("opacity", 0.6); // opacity of circle
       
            return this;
      }
    });
    
    return ScoreVsGraphView;
});