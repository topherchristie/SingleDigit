define(['text!templates/scoreTable.html','views/recentTable'],function(template,RecentView){
    var ScoreTableView = Backbone.View.extend({
  //      tagName:'div',
    //    className:'scoreTableWrapper',
        template: Handlebars.compile(template),
        events:{
            "click button.y2013":          "y2013",
            "click button.y2012":          "y2012",
            "click button.all":          "all",
            "click button.last20":          "last20",
            "click button.last5":          "last5"
        },
        initialize:function(){
            console.log("initialize ScoreTable",new RecentView());
            this.collection.setFilter("last","20");
            this.views={};
           this.render();
        },
        y2013: function(e){
            this.collection.setFilter('year',2013);
            this.views.recent.render();
        },
        y2012: function(e){
            this.collection.setFilter('year',2012);
            this.views.recent.render();
        },
        last20: function(e){
            this.collection.setFilter('last',20);
            this.views.recent.render();
        },
        last5: function(e){
            this.collection.setFilter('last',5);
            this.views.recent.render();
        },
        all: function(e){
            this.collection.setFilter(null,null);
            this.views.recent.render();
        },
        hide:function(){
            this.$el.hide();
        },
        show:function(){
            this.$el.show();
        },
        
        render: function(){
            
            var $el = $(this.el);
            var html =this.template({});
            console.log("rendering ScoreTable",$el.html(),":");
            $el.html(html);
            var self = this;
            this.views.recent = new RecentView({el:$(this.el).find("#recentTable"),collection:this.collection});
            this.collection.fetch({data:{},success: function(res){ 
                self.views.recent.render();
            }});
            return this;
        }
        
    });
    return ScoreTableView;
});