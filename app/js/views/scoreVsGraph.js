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
        plotFunction: function(data){
            var sumX=0;
            var sumY=0;
            var sumXSquares=0;
            var sumXYProducts=0;
            var cnt=0;
            for(var i=0;i<data.length;i++){
                var item = data[i];
                cnt += item.cnt;
                sumX += item.x * item.cnt;
                sumY += item.y * item.cnt;
                sumXSquares += item.x * item.x * item.cnt;
                sumXYProducts += item.x*item.y * item.cnt;
            }
       /*     console.log("cnt",cnt);
            console.log("sumX",sumX);
            console.log("sumY",sumY);
            console.log("sumXSquares",sumXSquares);
            console.log("sumXYProducts",sumXYProducts);
         */   
            
            var meanY = sumY / cnt;
            var meanX = sumX / cnt;
           // console.log("meanY",meanY);
        //    console.log("meanX",meanX);
            var b =  (sumXYProducts - (sumX * sumY) / cnt) / (sumXSquares - (sumX * sumX)/ cnt);
            var a = meanY - b * meanX;
          //  console.log("b",b);
            //console.log("a",a);
            
            return function(x){
                var y = a + b * x;
                console.log("x,y = ",x,',',y);
                return y;
                //return 1;
            };
        },
        render: function(){
            var margin = {top:20,bottom:30,left:40,right:15};
            var fullWidth = 400;
            var fullHeight = 300;
            var width = fullWidth - margin.left - margin.right;
            var height = fullHeight - margin.top - margin.bottom;
            var data = this.model.toJSON().data;

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


            if(!this.graph){
                this.graph = d3.select(this.el).append("svg:svg")
                .attr("width", fullWidth)
                .attr("height", fullHeight)
                .attr("class",'graph')
                ;
                this.main = this.graph.append('g')
                .attr('transform','translate(' +margin.left + ',' + margin.top + ')')
                .attr('width',width)
                .attr('height',height)
                .attr('class','main');
                // draw the x axis
                this.xAxis = d3.svg.axis().scale(x).orient('bottom');
                this.xAxisHolder = this.main.append('g')
                    .attr('transform', 'translate(0,' + height + ')')
                    .attr('class', 'x axis');
                // draw the y axis
                this.yAxis = d3.svg.axis().scale(y).orient('left')//.ticks(yMax-yMin+1);
                this.yAxisHolder = this.main.append('g').attr('transform', 'translate(0,0)').attr('class', 'y axis');
                this.circles = this.main.append("svg:g"); 

                // draw the x axis
                this.xAxis = d3.svg.axis().scale(x).orient('bottom');
                this.xAxisHolder = this.main.append('g')
                    .attr('transform', 'translate(0,' + height + ')')
                    .attr('class', 'x axis');
                // draw the y axis
                this.yAxis = d3.svg.axis().scale(y).orient('left')//.ticks(yMax-yMin+1);
                this.yAxisHolder = this.main.append('g').attr('transform', 'translate(0,0)').attr('class', 'y axis');
                this.circles = this.main.append("svg:g"); 
            }
            
            this.xAxis.scale(x);
            this.xAxisHolder.call(this.xAxis);
            this.yAxis.scale(y);
            this.yAxisHolder
            .transition()
            .duration(1000)
            .ease("linear")
            .call(this.yAxis);
               // draw the graph object
            var self = this;
            this.circles.selectAll("circle").remove();
            var rrr = this.circles.selectAll("circle")
            .data(data)  // using the values in the ydata array
            ;
            
            rrr.enter().append("svg:circle")  // create a new circle for each value
            .attr("cy", function (d) { return y(d.y); } ) // translate y value to a pixel
            .attr("cx", function (d,i) { return x(d.x); } ) // translate x value
            .attr("title", function(d) {return "h ha ha" + d.y;})
            .attr("r", function(d) {return 2 + d.cnt*2;})// radius of circle
            .attr('class','tooltipCircle')
            .on("mouseover",function(){   
          //      console.log("mouseover" + $(this).attr('title'));
                $(this).tooltip('show'); 
              //  setTimeout(function(){ $(obj).tooltip('hide');},5000);
            })
           /* .on("mouseout",function(){   
                console.log("mouseout" + $(this).attr('title'));
                var obj = this; 
                $(obj).tooltip('hide'); 
                //setTimeout(function(){ $(obj).tooltip('hide');},5000);
            }).on("click",function(){   
                var obj = this; 
                $(obj).tooltip('show'); 
              //  setTimeout(function(){ $(obj).tooltip('hide');},5000);
            })//.exit().remove()
            */
            ;
            rrr
                .transition()
            .duration(1000)
            .attrTween('cx', function(a) {
                var i = d3.interpolate(this._previous, a.x);
                this._previous = i(0);
                return function(t) {
                    return x(i(t));
                };
            })
            .attrTween('cy', function(a) {
                var i = d3.interpolate(this._previous, a.y);
                this._previous = i(0);
                return function(t) {
                    return y(i(t));
                };
            });
            rrr.exit().remove();
            var yAvg = (yMax + yMin) / 2;
            $("body").tooltip({ selector: ".tooltipCircle" });
     // .style("opacity", 0.6); // opacity of circle
            var plot = self.plotFunction(data);
            if(this.myLine){
                this.myLine.remove();
            }
            this.myLine = this.main.append("svg:line")
                .attr("x1", x(xMin-1))
                .attr("y1", y(plot(xMin-1)))
                .attr("x2", x(xMax-1))
                .attr("y2", y(plot(xMax-1)))
                .style("stroke", "rgb(6,120,155)");
            return this;
      }
    });
    
    return ScoreVsGraphView;
});